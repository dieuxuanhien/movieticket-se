import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateHallDto, UpdateHallDto, CreateSeatsDto } from './dto/hall.dto';

@Injectable()
export class HallsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const hall = await this.prisma.hall.findUnique({
      where: { id },
      include: {
        cinema: true,
        _count: {
          select: { seats: true, showtimes: true },
        },
      },
    });

    if (!hall) {
      throw new NotFoundException('Hall not found');
    }

    return hall;
  }

  async create(createHallDto: CreateHallDto) {
    // Verify cinema exists
    const cinema = await this.prisma.cinema.findUnique({
      where: { id: createHallDto.cinemaId },
    });

    if (!cinema) {
      throw new NotFoundException('Cinema not found');
    }

    return this.prisma.hall.create({
      data: createHallDto,
      include: { cinema: true },
    });
  }

  async update(id: string, updateHallDto: UpdateHallDto) {
    const hall = await this.prisma.hall.findUnique({ where: { id } });

    if (!hall) {
      throw new NotFoundException('Hall not found');
    }

    return this.prisma.hall.update({
      where: { id },
      data: updateHallDto,
      include: { cinema: true },
    });
  }

  async delete(id: string) {
    const hall = await this.prisma.hall.findUnique({ where: { id } });

    if (!hall) {
      throw new NotFoundException('Hall not found');
    }

    // Check if there are any future showtimes
    const futureShowtimes = await this.prisma.showtime.count({
      where: {
        hallId: id,
        startTime: { gte: new Date() },
      },
    });

    if (futureShowtimes > 0) {
      throw new BadRequestException(
        'Cannot delete hall with scheduled showtimes',
      );
    }

    await this.prisma.hall.delete({ where: { id } });

    return { message: 'Hall deleted successfully' };
  }

  async getSeats(hallId: string) {
    const hall = await this.prisma.hall.findUnique({ where: { id: hallId } });

    if (!hall) {
      throw new NotFoundException('Hall not found');
    }

    const seats = await this.prisma.seat.findMany({
      where: { hallId },
      orderBy: [{ rowLetter: 'asc' }, { seatNumber: 'asc' }],
    });

    // Group seats by row
    const seatsByRow = seats.reduce(
      (acc, seat) => {
        if (!acc[seat.rowLetter]) {
          acc[seat.rowLetter] = [];
        }
        acc[seat.rowLetter].push(seat);
        return acc;
      },
      {} as Record<string, typeof seats>,
    );

    return {
      hall,
      seatsByRow,
      totalSeats: seats.length,
    };
  }

  async createSeats(hallId: string, createSeatsDto: CreateSeatsDto) {
    const hall = await this.prisma.hall.findUnique({ where: { id: hallId } });

    if (!hall) {
      throw new NotFoundException('Hall not found');
    }

    // Delete existing seats if any
    await this.prisma.seat.deleteMany({ where: { hallId } });

    const seats: any[] = [];
    const { rows } = createSeatsDto;

    for (const row of rows) {
      for (let i = 1; i <= row.seatsCount; i++) {
        seats.push({
          hallId,
          rowLetter: row.rowLetter,
          seatNumber: i,
          type: row.seatType,
        });
      }
    }

    await this.prisma.seat.createMany({
      data: seats,
    });

    // Update hall capacity
    await this.prisma.hall.update({
      where: { id: hallId },
      data: { capacity: seats.length },
    });

    return {
      message: 'Seats created successfully',
      totalSeats: seats.length,
    };
  }

  async deleteSeats(hallId: string) {
    const hall = await this.prisma.hall.findUnique({ where: { id: hallId } });

    if (!hall) {
      throw new NotFoundException('Hall not found');
    }

    // Check if there are any bookings for this hall's seats
    const bookings = await this.prisma.ticket.count({
      where: {
        seat: { hallId },
      },
    });

    if (bookings > 0) {
      throw new BadRequestException(
        'Cannot delete seats that have been booked',
      );
    }

    await this.prisma.seat.deleteMany({ where: { hallId } });

    // Update hall capacity
    await this.prisma.hall.update({
      where: { id: hallId },
      data: { capacity: 0 },
    });

    return { message: 'Seats deleted successfully' };
  }
}
