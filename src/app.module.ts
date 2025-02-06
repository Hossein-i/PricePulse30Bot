import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TelegramModule } from './telegram/telegram.module';

@Module({
  imports: [ConfigModule.forRoot(), ScheduleModule.forRoot(), TelegramModule],
})
export class AppModule {}
