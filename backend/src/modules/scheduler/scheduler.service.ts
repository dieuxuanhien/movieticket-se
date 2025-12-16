import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CustomLoggerService } from '../../common/services/logger.service';
import { BookingsService } from '../bookings/bookings.service';
import { SeatLockService } from '../bookings/seat-lock.service';
import { PaymentService } from '../bookings/payment.service';

@Injectable()
export class SchedulerService {
  constructor(
    private readonly logger: CustomLoggerService,
    private readonly bookingsService: BookingsService,
    private readonly seatLockService: SeatLockService,
    private readonly paymentService: PaymentService,
  ) {
    this.logger = new CustomLoggerService(SchedulerService.name);
  }

  /**
   * Cron job that runs every minute to check and update expired bookings, payments, and seat locks
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredItems() {
    this.logger.log('Starting cron job to check expired items');

    try {
      // Expire pending bookings that have passed their expiration time
      const bookingResult = await this.bookingsService.expirePendingBookings();
      this.logger.log(`Expired ${bookingResult.expiredCount} bookings`);

      // Clean up expired seat locks
      const seatLockResult = await this.seatLockService.cleanupExpiredLocks();
      this.logger.log(
        `Cleaned up ${seatLockResult.deletedCount} expired seat locks`,
      );

      // Expire old pending payments (optional, if needed)
      // const paymentResult = await this.expireOldPayments();
      // this.logger.log(`Expired ${paymentResult.expiredCount} payments`);
    } catch (error) {
      this.logger.error('Error in cron job', error);
    }
  }

  /**
   * Expire payments that have been pending for too long
   * This is optional since payments are tied to bookings
   */
  // private async expireOldPayments(): Promise<{ expiredCount: number }> {
  //   // Implementation would go here if needed
  //   // For example, expire payments older than 30 minutes
  //   return { expiredCount: 0 };
  // }
}
