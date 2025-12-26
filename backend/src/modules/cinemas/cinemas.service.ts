import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ClerkService } from '../../infrastructure/clerk/clerk.service';
import { CreateCinemaDto, UpdateCinemaDto } from './dto/cinema.dto';

@Injectable()
export class CinemasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clerkService: ClerkService,
  ) {}

  async findAll(city?: string, status?: string) {
    const where: any = {};

    if (city) {
      where.city = city;
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.cinema.findMany({
      where,
      include: {
        _count: {
          select: { halls: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCities() {
    const cinemas = await this.prisma.cinema.findMany({
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' },
    });

    return cinemas.map((c) => c.city);
  }

  async findById(id: string) {
    const cinema = await this.prisma.cinema.findUnique({
      where: { id },
      include: {
        halls: {
          include: {
            _count: {
              select: { seats: true },
            },
          },
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        concessions: true,
      },
    });

    if (!cinema) {
      throw new NotFoundException('Cinema not found');
    }

    // Enrich reviews with user info from Clerk (batch)
    if (cinema.reviews.length > 0) {
      const userIds = [...new Set(cinema.reviews.map((r) => r.userId))];
      const userMap = await this.clerkService.getBatchUserInfo(userIds);

      cinema.reviews = cinema.reviews.map((review) => ({
        ...review,
        user: userMap.get(review.userId) || null,
      })) as any;
    }

    return cinema;
  }

  async create(createCinemaDto: CreateCinemaDto) {
    return this.prisma.cinema.create({
      data: createCinemaDto,
    });
  }

  async update(id: string, updateCinemaDto: UpdateCinemaDto) {
    const cinema = await this.prisma.cinema.findUnique({ where: { id } });

    if (!cinema) {
      throw new NotFoundException('Cinema not found');
    }

    return this.prisma.cinema.update({
      where: { id },
      data: updateCinemaDto,
    });
  }

  async delete(id: string) {
    const cinema = await this.prisma.cinema.findUnique({ where: { id } });

    if (!cinema) {
      throw new NotFoundException('Cinema not found');
    }

    await this.prisma.cinema.delete({ where: { id } });

    return { message: 'Cinema deleted successfully' };
  }

  async getHalls(cinemaId: string) {
    const cinema = await this.prisma.cinema.findUnique({
      where: { id: cinemaId },
    });

    if (!cinema) {
      throw new NotFoundException('Cinema not found');
    }

    return this.prisma.hall.findMany({
      where: { cinemaId },
      include: {
        _count: {
          select: { seats: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getShowtimes(cinemaId: string, date?: string, movieId?: string) {
    const cinema = await this.prisma.cinema.findUnique({
      where: { id: cinemaId },
    });

    if (!cinema) {
      throw new NotFoundException('Cinema not found');
    }

    const where: any = { cinemaId };

    if (movieId) {
      where.movieId = movieId;
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
      where.startTime = { gte: new Date() };
    }

    return this.prisma.showtime.findMany({
      where,
      include: {
        movie: true,
        hall: true,
        pricing: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }
}
