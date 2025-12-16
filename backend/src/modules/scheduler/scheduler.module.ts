import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [ScheduleModule.forRoot(), BookingsModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
