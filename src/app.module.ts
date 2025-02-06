import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// import { ScheduleModule } from '@nestjs/schedule';
import { BotModule } from './bot/bot.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    // ScheduleModule.forRoot(),
    BotModule,
  ],
})
export class AppModule {}
