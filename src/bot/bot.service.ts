import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { SchedulerService } from 'src/scheduler/scheduler.service';
import { Context, Markup, Middleware, Telegraf } from 'telegraf';
import {
  InlineKeyboardMarkup,
  Update,
} from 'telegraf/typings/core/types/typegram';

/**
 * Constant representing a 30-minute interval in milliseconds.
 *
 * Value is calculated as 30 minutes * 60 seconds per minute * 1000 milliseconds per second.
 */
const EVERY_30_MINUTES = 30 * 60 * 1000;

/**
 * The `BotService` class is responsible for managing the Telegram bot interactions,
 * handling user commands, and scheduling periodic tasks for currency price updates.
 * It implements the `OnModuleInit` interface to initialize the bot and its functionalities
 * when the module is initialized.
 *
 * @class
 * @implements {OnModuleInit}
 */
@Injectable()
export class BotService implements OnModuleInit {
  /**
   * An instance of the Telegraf bot used to interact with the Telegram API.
   * This bot handles the messaging and command functionalities for the application.
   */
  private bot: Telegraf;

  /**
   * A logger instance for the BotService class.
   * Used to log messages and errors for debugging and monitoring purposes.
   */
  private readonly logger = new Logger(BotService.name);

  /**
   * A map of currency pairs with their respective locale and currency information.
   *
   * The map keys are strings representing the currency pair (e.g., 'USDTIRT').
   * The map values are objects containing 'from' and 'to' properties, each of which
   * includes a 'locale' and 'currency' string.
   *
   * Example currency pairs:
   * - 'USDTIRT': Converts from USD to IRR with respective locales 'en-US' and 'fa-IR'.
   * - 'BTCIRT': Converts from BTC to IRR with respective locales 'en-US' and 'fa-IR'.
   */
  private readonly currencies: Map<
    string,
    {
      from: { locale: string; currency: string };
      to: { locale: string; currency: string };
    }
  > = new Map([
    [
      'USDTIRT',
      {
        from: { locale: 'en-US', currency: 'USD' },
        to: { locale: 'fa-IR', currency: 'IRR' },
      },
    ],
    [
      'BTCIRT',
      {
        from: { locale: 'en-US', currency: 'BTC' },
        to: { locale: 'fa-IR', currency: 'IRR' },
      },
    ],
  ]);

  /**
   * A map that stores chat information.
   * The key is the chat ID (number).
   * The value is an object containing a set of subscribed currencies (Set<string>).
   */
  private readonly chats: Map<number, { subscribedCurrencies: Set<string> }> =
    new Map();

  /**
   * Initializes the BotService with the provided SchedulerService.
   *
   * @param schedulerService The service responsible for scheduling jobs.
   */
  constructor(private readonly schedulerService: SchedulerService) {}

  /**
   * Initializes the Telegram bot and sets up command handlers and scheduled jobs.
   */
  onModuleInit() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

    this.bot.use(this.initializeChatIfAbsent);
    this.bot.start((ctx) => {
      const welcomeMessage =
        '🌐 Welcome to Price Pulse! 🌐 \n\n🤖 Price Pulse is your smart assistant for real-time currency price monitoring! 💹 \n\n✨ Every half hour, I will inform you of the latest prices of your selected currencies. Just select the currencies you want and leave the rest to me! 🕒 \n\n✅ How to get started? \n1. Send the command /subscribe. \n2. In the menu that appears, enable or disable the currencies you want by clicking on the buttons below. \n3. After selecting, click the "Confirm" button. \n\nFrom now on, I will send you the prices of your selected currencies every half hour! 📊';

      ctx.reply(welcomeMessage);
    });

    this.bot.command('subscribe', (ctx) => {
      const chatId = ctx.chat.id;

      ctx.reply(
        'Please select your preferred currencies:',
        this.createCurrencyKeyboard(chatId),
      );
    });

    this.bot.action(/toggle_currency_(.+)/, (ctx) => {
      const chatId = ctx.chat.id;
      const currency = ctx.match[1];
      const { subscribedCurrencies, ...rest } = this.chats.get(chatId);
      const updatedSubscribedCurrencies = new Set(subscribedCurrencies);

      if (subscribedCurrencies.has(currency)) {
        updatedSubscribedCurrencies.delete(currency);
      } else {
        updatedSubscribedCurrencies.add(currency);
      }

      this.chats.set(chatId, {
        ...rest,
        subscribedCurrencies: updatedSubscribedCurrencies,
      });

      ctx.editMessageText(
        'Please select your preferred currencies:',
        this.createCurrencyKeyboard(chatId),
      );
    });

    this.bot.action('confirm_currency', (ctx) => {
      const chatId = ctx.chat.id;
      const { subscribedCurrencies } = this.chats.get(chatId);

      if (subscribedCurrencies.size === 0) {
        ctx.answerCbQuery('⚠️ Please select at least one currency.');
      } else {
        ctx.deleteMessage();
        ctx.reply(
          `✅ Your selected currencies: \n${Array.from(subscribedCurrencies).join(', ')} \n\nFrom now on, I will send you the prices of these currencies every half hour.`,
        );
      }
    });

    this.bot.command('unsubscribe', (ctx) => {
      const chatId = ctx.chat.id;
      const user = this.chats.get(chatId);
      this.chats.set(chatId, { ...user, subscribedCurrencies: new Set() });
      ctx.reply('Your subscriptions has been successfully canceled!');
    });

    this.bot.catch((err) =>
      this.logger.error('[Bot]: Something went wrong! ', err),
    );

    this.bot.launch();

    this.schedulerService.scheduleJob(
      'sendPriceUpdate',
      EVERY_30_MINUTES,
      () => {
        this.sendPriceUpdate();
      },
    );
  }

  /**
   * Middleware to initialize chat data if it is absent.
   *
   * This middleware checks if the chat ID exists in the `chats` map. If it does not,
   * it initializes the chat data with an empty set of subscribed currencies.
   *
   * @param ctx The context object containing the chat information.
   * @param next The next middleware function in the stack.
   */
  private initializeChatIfAbsent: Middleware<Context<Update>> = (ctx, next) => {
    const chatId = ctx.chat.id;

    if (!this.chats.has(chatId)) {
      this.chats.set(chatId, { subscribedCurrencies: new Set() });
    }

    next();
  };

  /**
   * Creates an inline keyboard markup for selecting currencies.
   * Each button represents a currency that the user can subscribe to or unsubscribe from.
   * The button text indicates whether the currency is currently subscribed (⭕) or not (❌).
   * Additionally, a "Confirm" button is added at the end of the keyboard.
   *
   * @param {number} chatId The ID of the chat for which the keyboard is being created.
   *
   * @returns {Markup.Markup<InlineKeyboardMarkup>} A Markup object containing the inline keyboard with currency buttons.
   */
  private createCurrencyKeyboard(
    chatId: number,
  ): Markup.Markup<InlineKeyboardMarkup> {
    const buttons = Array.from(this.currencies.keys()).map((currency) => {
      const { subscribedCurrencies } = this.chats.get(chatId);
      const isActive = subscribedCurrencies.has(currency);

      return Markup.button.callback(
        isActive ? `⭕ ${currency}` : `❌ ${currency}`,
        `toggle_currency_${currency}`,
      );
    });

    buttons.push(Markup.button.callback('Confirm', 'confirm_currency'));

    return Markup.inlineKeyboard(buttons, { columns: 2 });
  }

  /**
   * Sends a price update to all subscribed users.
   *
   * This method retrieves the latest currency prices and formats them according to the user's locale and currency preferences.
   * It then sends a message to each subscribed user with the updated prices.
   *
   * The method performs the following steps:
   * 1. Checks if there are any subscribed users. If not, logs a warning and exits.
   * 2. Retrieves and formats the latest prices for each currency.
   * 3. Constructs a message for each subscribed user with their respective currencies.
   * 4. Sends the constructed message to each user via the bot.
   *
   * @returns {Promise<void>} A promise that resolves when the price updates have been sent.
   *
   * @throws {Error} If there is an error fetching the price for a currency, it logs the error and includes an error message in the user's update.
   */
  private async sendPriceUpdate(): Promise<void> {
    if (this.chats.size === 0) {
      this.logger.warn('No users subscribed. Waiting for /start command.');
      return;
    }

    const header = `Price Pulse!\n${this.getFormattedUTCDate()}`;

    const messages: [string, string][] = await Promise.all(
      Array.from(this.currencies).map(async ([currency, { from, to }]) => {
        try {
          const currencyFormatterFrom = this.createCurrencyFormatter(from);
          const currencyFormatterTo = this.createCurrencyFormatter(to);

          const price = await this.getCurrencyPrice(currency);

          return [
            currency,
            `${currency} \n${currencyFormatterFrom.format(1)} = ${currencyFormatterTo.format(price)}`,
          ];
        } catch (error) {
          this.logger.error(`Error fetching price for ${currency}:`, error);
          return [
            currency,
            `Error retrieving price for ${currency}. Please try again later.`,
          ];
        }
      }),
    );

    const messageMap = new Map(messages);

    for (const [chatId, { subscribedCurrencies }] of this.chats) {
      if (!subscribedCurrencies || subscribedCurrencies.size === 0) {
        continue;
      }

      const currencyMessages = Array.from(subscribedCurrencies)
        .map((currency) => messageMap.get(currency))
        .filter(Boolean);

      currencyMessages.unshift(header);

      const message = currencyMessages.join(
        '\n-------------------------------- \n',
      );
      await this.bot.telegram.sendMessage(chatId, message);
    }
  }

  /**
   * Fetches the price of the specified currency from the Nobitex API.
   *
   * @param {string} currency The currency symbol to fetch the price for.
   *
   * @returns {Promise<number>} A promise that resolves to the rounded price of the currency.
   *
   * @throws {Error} Throws an error if the price fetching fails.
   */
  private async getCurrencyPrice(currency: string): Promise<number> {
    try {
      const response = await axios.get(
        `https://api.nobitex.ir/v2/orderbook/${currency}`,
      );
      return Math.round(response.data.asks[0][0]);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new Error('Failed to fetch Tether price');
    }
  }

  /**
   * Returns the current date and time in UTC formatted as a string.
   * The format of the returned string is `YY/MM/DD - HH:mm - UTC`.
   *
   * @returns {string} The formatted UTC date and time string.
   */
  private getFormattedUTCDate(): string {
    const now = new Date();

    const year = now.getUTCFullYear().toString();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');

    return `${year}/${month}/${day} - ${hours}:${minutes} - UTC`;
  }

  /**
   * Creates a currency formatter based on the provided locale and currency.
   *
   * @param props An object containing the locale and currency.
   * @param props.locale The locale to use for formatting.
   * @param props.currency The currency to use for formatting.
   *
   * @returns An `Intl.NumberFormat` instance configured for the specified locale and currency.
   */
  private createCurrencyFormatter(props: { locale: string; currency: string }) {
    const { locale, currency } = props;

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    });
  }
}
