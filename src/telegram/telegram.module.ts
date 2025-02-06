import { Module } from '@nestjs/common';
import { BotService } from './telegram.service';

@Module({
  providers: [BotService],
})
export class TelegramModule {}
