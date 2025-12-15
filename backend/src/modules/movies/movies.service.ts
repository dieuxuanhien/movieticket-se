import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaginationService } from '../../common/services/pagination.service';
import { CreateMovieDto, UpdateMovieDto } from './dto/movie.dto';

@Injectable()
export class MoviesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationService: PaginationService,
  ) {}

  async findAll(
    paginationParams: { page?: number; perPage?: number },
    search?: string,
    genreId?: string,
  ) {
    const { page, perPage } =
      this.paginationService.getPaginationParams(paginationParams);
    const skip = this.paginationService.getSkip(page, perPage);

    const where: any = {};

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    if (genreId) {
      where.genres = { some: { id: genreId } };
    }

    const [movies, total] = await Promise.all([
      this.prisma.movie.findMany({
        where,
        skip,
        take: perPage,
        include: { genres: true },
        orderBy: { releaseDate: 'desc' },
      }),
      this.prisma.movie.count({ where }),
    ]);

    return {
      data: movies,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async getNowShowing() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.movie.findMany({
      where: {
        releaseDate: { lte: today },
        showtimes: {
          some: {
            startTime: { gte: today },
          },
        },
      },
      include: { genres: true },
      orderBy: { releaseDate: 'desc' },
    });
  }

  async getComingSoon() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.movie.findMany({
      where: {
        releaseDate: { gt: today },
      },
      include: { genres: true },
      orderBy: { releaseDate: 'asc' },
    });
  }

  async findById(id: string) {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
      include: { genres: true },
    });

    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    return movie;
  }

  async create(createMovieDto: CreateMovieDto) {
    const { genreIds, ...movieData } = createMovieDto;

    return this.prisma.movie.create({
      data: {
        ...movieData,
        genres: genreIds
          ? {
              connect: genreIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: { genres: true },
    });
  }

  async update(id: string, updateMovieDto: UpdateMovieDto) {
    const movie = await this.prisma.movie.findUnique({ where: { id } });

    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    const { genreIds, ...movieData } = updateMovieDto;

    return this.prisma.movie.update({
      where: { id },
      data: {
        ...movieData,
        genres: genreIds
          ? {
              set: genreIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: { genres: true },
    });
  }

  async delete(id: string) {
    const movie = await this.prisma.movie.findUnique({ where: { id } });

    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    await this.prisma.movie.delete({ where: { id } });

    return { message: 'Movie deleted successfully' };
  }

  async getShowtimes(movieId: string, cinemaId?: string, date?: string) {
    const movie = await this.prisma.movie.findUnique({
      where: { id: movieId },
    });

    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    const where: any = { movieId };

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
        cinema: true,
        hall: true,
        pricing: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }
}
