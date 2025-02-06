import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Telegraf;
  private logger = new Logger(BotService.name);
  private subscribedChatIds: Set<number> = new Set();

  constructor() {}

  onModuleInit() {
    // تنظیمات MTProto Proxy
    const proxyOptions = {
      host: process.env.TELEGRAM_PROXY_HOST, // آدرس پروکسی (مثلاً 1.2.3.4)
      port: process.env.TELEGRAM_PROXY_PORT, // پورت پروکسی (معمولاً 443)
      auth: {
        username: process.env.TELEGRAM_PROXY_USER, // اگر نیاز به احراز هویت داره
        password: process.env.TELEGRAM_PROXY_PASS, // اگر نیاز به احراز هویت داره
      },
      protocol: process.env.TELEGRAM_PROXY_PROTOCOL, // نوع پروتکل
      secret: process.env.TELEGRAM_PROXY_SECRET, // کلید مخفی (secret) پروکسی
    };

    // ایجاد اتصال با پروکسی
    const agent = new SocksProxyAgent(
      `socks5://${proxyOptions.host}:${proxyOptions.port}`,
    );

    // تنظیم ربات با پروکسی
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN, {
      telegram: {
        agent, // استفاده از پروکسی
        ...proxyOptions, // اضافه کردن تنظیمات پروکسی
      },
    });

    // دستور /start
    this.bot.command('start', (ctx) => {
      this.subscribedChatIds.add(ctx.chat.id);
      ctx.reply('شما با موفقیت عضو شدید! قیمت تتر هر 30 دقیقه ارسال خواهد شد.');
    });

    this.bot.launch();
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async sendPriceUpdate() {
    if (this.subscribedChatIds.size === 0) {
      this.logger.warn('No chat ID set. Waiting for /start command.');
      return;
    }

    try {
      const price = await this.getTetherPrice();
      const message = `قیمت فعلی تتر (USDT): ${price} تومان`;

      for (const chatId of this.subscribedChatIds) {
        await this.bot.telegram.sendMessage(chatId, message);
      }
    } catch (error) {
      this.logger.error('Error sending price update:', error);
      for (const chatId of this.subscribedChatIds) {
        await this.bot.telegram.sendMessage(
          chatId,
          'ببخشید، در این لحظه نمیتونم قیمت‌ها رو دریافت کنم.',
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
