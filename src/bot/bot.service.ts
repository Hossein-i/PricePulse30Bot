import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import axios from 'axios';
import { Telegraf } from 'telegraf';

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Telegraf;
  private logger = new Logger(BotService.name);
  private subscribedChatIds: Set<number> = new Set();

  constructor() {}
  onModuleInit() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

    // دستور /start
    this.bot.start((ctx) => {
      this.subscribedChatIds.add(ctx.chat.id);
      ctx.reply('شما با موفقیت عضو شدید! قیمت تتر هر 30 دقیقه ارسال خواهد شد.');
    });

    // دستور /stop
    this.bot.command('stop', (ctx) => {
      this.subscribedChatIds.delete(ctx.chat.id);
      ctx.reply('شما با موفقیت لغو عضو شدید!');
    });

    this.bot.launch();
  }

  // @Cron(CronExpression.EVERY_30_MINUTES)
  // async sendPriceUpdate() {
  //   if (this.subscribedChatIds.size === 0) {
  //     this.logger.warn('No chat ID set. Waiting for /start command.');
  //     return;
  //   }

  //   try {
  //     const price = await this.getTetherPrice();
  //     const message = `قیمت فعلی تتر (USDT): ${price} تومان`;

  //     for (const chatId of this.subscribedChatIds) {
  //       await this.bot.telegram.sendMessage(chatId, message);
  //     }
  //   } catch (error) {
  //     this.logger.error('Error sending price update:', error);
  //     for (const chatId of this.subscribedChatIds) {
  //       await this.bot.telegram.sendMessage(
  //         chatId,
  //         'ببخشید، در این لحظه نمیتونم قیمت‌ها رو دریافت کنم.',
  //       );
  //     }
  //   }
  // }

  // private async getTetherPrice(): Promise<number> {
  //   try {
  //     const response = await axios.get(
  //       'https://api.nobitex.ir/v2/orderbook/USDTIRT',
  //     );
  //     return Math.round(response.data.asks[0][0]); // قیمت اول از لیست asks
  //     // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   } catch (error) {
  //     throw new Error('Failed to fetch Tether price');
  //   }
  // }
}
