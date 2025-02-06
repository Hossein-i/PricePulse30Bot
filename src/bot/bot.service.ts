import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { SchedulerService } from 'src/scheduler/scheduler.service';
import { Telegraf } from 'telegraf';

const EVERY_30_MINUTES = 30 * 60 * 1000; // 30 دقیقه به میلی‌ثانیه

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Telegraf;
  private logger = new Logger(BotService.name);
  private subscribedChatIds: Set<number> = new Set();

  constructor(private readonly schedulerService: SchedulerService) {}

  onModuleInit() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

    // دستور /start
    this.bot.start((ctx) => {
      this.subscribedChatIds.add(ctx.chat.id);
      ctx.reply('شما با موفقیت عضو شدید! قیمت تتر هر 30 دقیقه ارسال خواهد شد.');
      this.sendPriceUpdate();
    });

    // دستور /stop
    this.bot.command('stop', (ctx) => {
      this.subscribedChatIds.delete(ctx.chat.id);
      ctx.reply('لغو عضویت شما با موفقیت انجام شد!');
    });

    this.bot.launch();

    this.schedulerService.scheduleJob(
      'sendPriceUpdate',
      EVERY_30_MINUTES,
      () => {
        this.sendPriceUpdate();
      },
    );
  }

  async sendPriceUpdate() {
    if (this.subscribedChatIds.size === 0) {
      this.logger.warn('No chat ID set. Waiting for /start command.');
      return;
    }

    try {
      const price = await this.getTetherPrice();
      const message = `قیمت فعلی تتر (USDT): ${price} ریال`;

      for (const chatId of this.subscribedChatIds) {
        await this.bot.telegram.sendMessage(chatId, message);
      }
    } catch (error) {
      this.logger.error('Error sending price update:', error);
      for (const chatId of this.subscribedChatIds) {
        await this.bot.telegram.sendMessage(
          chatId,
          'ببخشید، در این لحظه نمی‌توانم قیمت‌ها را ارسال کنم!',
        );
      }
    }
  }

  private async getTetherPrice(): Promise<number> {
    try {
      const response = await axios.get(
        'https://api.nobitex.ir/v2/orderbook/USDTIRT',
      );
      return Math.round(response.data.asks[0][0]); // قیمت اول از لیست asks
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new Error('Failed to fetch Tether price');
    }
  }
}
