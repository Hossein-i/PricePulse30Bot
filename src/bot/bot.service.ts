import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { SchedulerService } from 'src/scheduler/scheduler.service';
import { Markup, Telegraf } from 'telegraf';
import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';

const EVERY_30_MINUTES = 30 * 60 * 1000;

/**
 * Service responsible for handling Telegram bot interactions and scheduling price updates.
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

    this.bot.start((ctx) => {
      const chatId = ctx.chat.id;

      if (!this.chats.has(chatId)) {
        this.chats.set(chatId, { subscribedCurrencies: new Set() });
      }

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
   * Sends price updates to all subscribed users.
   *
   * This method checks if there are any users subscribed to receive price updates.
   * If there are no users, it logs a warning message and exits.
   *
   * For each subscribed user, it fetches the latest currency prices for the currencies
   * they are subscribed to and formats the prices according to the respective locales.
   * It then sends a message to the user with the formatted price information.
   *
   * If an error occurs while fetching the price for a currency, an error message is logged
   * and a fallback message is sent to the user.
   *
   * The message sent to the user includes a header with the current UTC date and time,
   * followed by the formatted price information for each subscribed currency.
   *
   * @returns {Promise<void>} A promise that resolves when the price updates have been sent.
   */
  private async sendPriceUpdate(): Promise<void> {
    if (this.chats.size === 0) {
      this.logger.warn('No users subscribed. Waiting for /start command.');
      return;
    }

    for (const [chatId, { subscribedCurrencies }] of this.chats) {
      if (!subscribedCurrencies || subscribedCurrencies.size === 0) {
        continue;
      }

      const messages = await Promise.all(
        Array.from(subscribedCurrencies).map(async (currency) => {
          try {
            const { from, to } = this.currencies.get(currency);
            const fromFormat = new Intl.NumberFormat(from.locale, {
              style: 'currency',
              currency: from.currency,
            });
            const toFormat = new Intl.NumberFormat(to.locale, {
              style: 'currency',
              currency: to.currency,
            });

            const price = await this.getCurrencyPrice(currency);
            return `${currency} \n${fromFormat.format(1)} = ${toFormat.format(price)}`;
          } catch (error) {
            this.logger.error(`Error fetching price for ${currency}:`, error);
            return `Error retrieving price for ${currency}. Please try again later.`;
          }
        }),
      );

      messages.unshift(`Price Pulse!\n ${this.getFormattedUTCDate()} `);
      const message = messages.join('\n---------------- \n');
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
}
