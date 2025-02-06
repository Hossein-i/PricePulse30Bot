import { Global, Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';

@Global()
@Module({
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
