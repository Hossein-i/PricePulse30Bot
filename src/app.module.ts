import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BotModule } from './bot/bot.module';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [ConfigModule.forRoot(), BotModule, SchedulerModule],
})
export class AppModule {}
