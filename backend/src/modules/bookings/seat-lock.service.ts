import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ConfigService } from '../../config/config.service';
import { CustomLoggerService } from '../../common/services/logger.service';
import { LockSeatsDto } from './dto/booking.dto';

@Injectable()
export class SeatLockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger = new CustomLoggerService(SeatLockService.name);
  }

  /**
   * Lock seats for a user - Phase 1 of booking process
   * Creates SeatLock records with expiration
   */
  async lockSeats(userId: string, lockSeatsDto: LockSeatsDto) {
    const { showtimeId, seatIds } = lockSeatsDto;

    this.logger.log('Attempting to lock seats', {
      userId,
      showtimeId,
      seatIds,
    });

    // Validate showtime exists
    const showtime = await this.prisma.showtime.findUnique({
      where: { id: showtimeId },
      include: { hall: true },
    });

    if (!showtime) {
      throw new BadRequestException('Showtime not found');
    }

    // Validate all seats exist and belong to the showtime's hall
    const seats = await this.prisma.seat.findMany({
      where: {
        id: { in: seatIds },
        hallId: showtime.hallId,
      },
    });

    if (seats.length !== seatIds.length) {
      throw new BadRequestException(
        'Some seats are invalid or do not belong to this hall',
      );
    }

    // Check if any seats are already sold (have tickets)
    const soldTickets = await this.prisma.ticket.findMany({
      where: {
        showtimeId,
        seatId: { in: seatIds },
      },
    });

    if (soldTickets.length > 0) {
      const soldSeatIds = soldTickets.map((t) => t.seatId);
      throw new ConflictException(
        `Seats ${soldSeatIds.join(', ')} are already sold`,
      );
    }

    // Check if any seats are already locked by other users
    const existingLocks = await this.prisma.seatLock.findMany({
      where: {
        showtimeId,
        seatId: { in: seatIds },
        expiresAt: { gt: new Date() },
        userId: { not: userId }, // Allow re-locking own seats
      },
    });

    if (existingLocks.length > 0) {
      const lockedSeatIds = existingLocks.map((l) => l.seatId);
      throw new ConflictException(
        `Seats ${lockedSeatIds.join(', ')} are currently locked by another user`,
      );
    }

    // Calculate expiration time
    const lockDurationMinutes = this.configService.seatLockDurationMinutes;
    const expiresAt = new Date(Date.now() + lockDurationMinutes * 60 * 1000);

    // Create or update locks in a transaction
    const locks = await this.prisma.$transaction(async (tx) => {
      // Delete any existing locks by this user for this showtime
      await tx.seatLock.deleteMany({
        where: {
          showtimeId,
          seatId: { in: seatIds },
          userId,
        },
      });

      // Create new locks
      await tx.seatLock.createMany({
        data: seatIds.map((seatId) => ({
          showtimeId,
          seatId,
          userId,
          expiresAt,
        })),
      });

      // Return created locks
      return tx.seatLock.findMany({
        where: {
          showtimeId,
          seatId: { in: seatIds },
          userId,
        },
        include: { seat: true },
      });
    });

    this.logger.log('Seats locked successfully', {
      userId,
      showtimeId,
      lockedSeats: locks.length,
      expiresAt,
    });

    return {
      message: 'Seats locked successfully',
      locks,
      expiresAt,
      lockDurationMinutes,
    };
  }

  /**
   * Release locked seats
   */
  async unlockSeats(userId: string, unlockSeatsDto: LockSeatsDto) {
    const { showtimeId, seatIds } = unlockSeatsDto;

    const deleted = await this.prisma.seatLock.deleteMany({
      where: {
        showtimeId,
        seatId: { in: seatIds },
        userId,
      },
    });

    this.logger.log('Seats unlocked', {
      userId,
      showtimeId,
      unlockedCount: deleted.count,
    });

    return {
      message: 'Seats unlocked successfully',
      unlockedCount: deleted.count,
    };
  }

  /**
   * Get all locks for a user
   */
  async getUserLocks(userId: string) {
    return this.prisma.seatLock.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      include: {
        seat: true,
        showtime: {
          include: {
            movie: true,
            cinema: true,
            hall: true,
            pricing: true,
          },
        },
      },
    });
  }

  /**
   * Clean up expired locks (can be called by a cron job)
   */
  async cleanupExpiredLocks() {
    const deleted = await this.prisma.seatLock.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    this.logger.log('Cleaned up expired locks', {
      deletedCount: deleted.count,
    });

    return { deletedCount: deleted.count };
  }
}
