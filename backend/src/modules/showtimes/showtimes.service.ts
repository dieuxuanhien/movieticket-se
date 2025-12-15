import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateShowtimeDto, UpdateShowtimeDto } from './dto/showtime.dto';

@Injectable()
export class ShowtimesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(movieId?: string, cinemaId?: string, date?: string) {
    const where: any = {};

    if (movieId) {
      where.movieId = movieId;
    }

    if (cinemaId) {
      where.cinemaId = cinemaId;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else {
      // Default: show upcoming showtimes
      where.startTime = { gte: new Date() };
    }

    return this.prisma.showtime.findMany({
      where,
      include: {
        movie: true,
        cinema: true,
        hall: true,
        pricing: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findById(id: string) {
    const showtime = await this.prisma.showtime.findUnique({
      where: { id },
      include: {
        movie: true,
        cinema: true,
        hall: {
          include: {
            _count: { select: { seats: true } },
          },
        },
        pricing: true,
      },
    });

    if (!showtime) {
      throw new NotFoundException('Showtime not found');
    }

    // Get booking stats
    const [soldTickets, lockedSeats] = await Promise.all([
      this.prisma.ticket.count({ where: { showtimeId: id } }),
      this.prisma.seatLock.count({
        where: {
          showtimeId: id,
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    return {
      ...showtime,
      stats: {
        totalSeats: showtime.hall._count.seats,
        sold: soldTickets,
        locked: lockedSeats,
        available: showtime.hall._count.seats - soldTickets - lockedSeats,
      },
    };
  }

  async create(createShowtimeDto: CreateShowtimeDto) {
    const { pricing, ...showtimeData } = createShowtimeDto;

    // Validate movie exists
    const movie = await this.prisma.movie.findUnique({
      where: { id: showtimeData.movieId },
    });
    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    // Validate cinema and hall exist
    const hall = await this.prisma.hall.findUnique({
      where: { id: showtimeData.hallId },
      include: { cinema: true },
    });
    if (!hall) {
      throw new NotFoundException('Hall not found');
    }

    // Ensure hall belongs to the specified cinema
    if (hall.cinemaId !== showtimeData.cinemaId) {
      throw new BadRequestException(
        'Hall does not belong to the specified cinema',
      );
    }

    // Calculate end time based on movie runtime
    const startTime = new Date(showtimeData.startTime);
    const endTime = new Date(startTime.getTime() + movie.runtime * 60 * 1000);

    // Check for scheduling conflicts (overlap)
    // Condition: (NewStart < ExistingEnd) AND (NewEnd > ExistingStart)
    const conflictingShowtime = await this.prisma.showtime.findFirst({
      where: {
        hallId: showtimeData.hallId,
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
    });

    if (conflictingShowtime) {
      throw new ConflictException(
        'This hall already has a showtime scheduled during this time slot',
      );
    }

    // Create showtime with pricing in a transaction
    return this.prisma.$transaction(async (tx) => {
      const showtime = await tx.showtime.create({
        data: {
          ...showtimeData,
          startTime,
          endTime,
        },
      });

      // Create pricing entries
      if (pricing && pricing.length > 0) {
        await tx.ticketPricing.createMany({
          data: pricing.map((p) => ({
            showtimeId: showtime.id,
            seatType: p.seatType,
            price: p.price,
          })),
        });
      }

      return tx.showtime.findUnique({
        where: { id: showtime.id },
        include: {
          movie: true,
          cinema: true,
          hall: true,
          pricing: true,
        },
      });
    });
  }

  async update(id: string, updateShowtimeDto: UpdateShowtimeDto) {
    const showtime = await this.prisma.showtime.findUnique({
      where: { id },
      include: { movie: true },
    });

    if (!showtime) {
      throw new NotFoundException('Showtime not found');
    }

    // Check if there are any bookings
    const bookings = await this.prisma.booking.count({
      where: { showtimeId: id },
    });

    if (bookings > 0 && updateShowtimeDto.startTime) {
      throw new BadRequestException(
        'Cannot change showtime with existing bookings',
      );
    }

    const { pricing, ...showtimeData } = updateShowtimeDto;

    // If startTime is being updated, recalculate endTime
    if (showtimeData.startTime) {
      const startTime = new Date(showtimeData.startTime);
      const runtime = showtime.movie.runtime;
      showtimeData['endTime'] = new Date(
        startTime.getTime() + runtime * 60 * 1000,
      );

      // Check for conflicts
      const conflictingShowtime = await this.prisma.showtime.findFirst({
        where: {
          hallId: showtimeData.hallId || showtime.hallId,
          id: { not: id },
          AND: [
            { startTime: { lt: showtimeData['endTime'] } },
            { endTime: { gt: startTime } },
          ],
        },
      });

      if (conflictingShowtime) {
        throw new ConflictException(
          'This hall already has a showtime scheduled during this time slot',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Update pricing if provided
      if (pricing) {
        await tx.ticketPricing.deleteMany({ where: { showtimeId: id } });
        await tx.ticketPricing.createMany({
          data: pricing.map((p) => ({
            showtimeId: id,
            seatType: p.seatType,
            price: p.price,
          })),
        });
      }

      return tx.showtime.update({
        where: { id },
        data: showtimeData,
        include: {
          movie: true,
          cinema: true,
          hall: true,
          pricing: true,
        },
      });
    });
  }

  async delete(id: string) {
    const showtime = await this.prisma.showtime.findUnique({ where: { id } });

    if (!showtime) {
      throw new NotFoundException('Showtime not found');
    }

    // Check if there are any bookings
    const bookings = await this.prisma.booking.count({
      where: { showtimeId: id },
    });

    if (bookings > 0) {
      throw new BadRequestException(
        'Cannot delete showtime with existing bookings',
      );
    }

    await this.prisma.showtime.delete({ where: { id } });

    return { message: 'Showtime deleted successfully' };
  }
}
