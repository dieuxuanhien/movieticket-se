import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { SeatLockService } from './seat-lock.service';
import { PaymentService } from './payment.service';
import { VnpayService } from './vnpay.service';

import { ConfigModule } from 'src/config/config.module';
// import { ConfigModule } from './../../config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [BookingsController],
  providers: [BookingsService, SeatLockService, PaymentService, VnpayService],
  exports: [BookingsService, SeatLockService, VnpayService],
})
export class BookingsModule {}
