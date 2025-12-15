import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaginationService } from '../../common/services/pagination.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationService: PaginationService,
  ) {}

  async findAll(
    cinemaId?: string,
    paginationParams?: { page?: number; perPage?: number },
  ) {
    const { page, perPage } =
      this.paginationService.getPaginationParams(paginationParams);
    const skip = this.paginationService.getSkip(page, perPage);

    const where = cinemaId ? { cinemaId } : {};

    const [reviews, total] = await Promise.all([
      this.prisma.cinemaReview.findMany({
        where,
        skip,
        take: perPage,
        include: {
          user: {
            select: { id: true, fullName: true },
          },
          cinema: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.cinemaReview.count({ where }),
    ]);

    return {
      data: reviews,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async getByCinema(cinemaId: string) {
    const cinema = await this.prisma.cinema.findUnique({
      where: { id: cinemaId },
    });

    if (!cinema) {
      throw new NotFoundException('Cinema not found');
    }

    return this.prisma.cinemaReview.findMany({
      where: { cinemaId },
      include: {
        user: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCinemaStats(cinemaId: string) {
    const cinema = await this.prisma.cinema.findUnique({
      where: { id: cinemaId },
    });

    if (!cinema) {
      throw new NotFoundException('Cinema not found');
    }

    const reviews = await this.prisma.cinemaReview.findMany({
      where: { cinemaId },
      select: { rating: true },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    const ratingDistribution = {
      1: reviews.filter((r) => r.rating === 1).length,
      2: reviews.filter((r) => r.rating === 2).length,
      3: reviews.filter((r) => r.rating === 3).length,
      4: reviews.filter((r) => r.rating === 4).length,
      5: reviews.filter((r) => r.rating === 5).length,
    };

    return {
      cinemaId,
      cinemaName: cinema.name,
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
    };
  }

  async getUserReviews(userId: string) {
    return this.prisma.cinemaReview.findMany({
      where: { userId },
      include: {
        cinema: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, createReviewDto: CreateReviewDto) {
    // Validate cinema exists
    const cinema = await this.prisma.cinema.findUnique({
      where: { id: createReviewDto.cinemaId },
    });

    if (!cinema) {
      throw new NotFoundException('Cinema not found');
    }

    // Check if user already reviewed this cinema
    const existingReview = await this.prisma.cinemaReview.findUnique({
      where: {
        cinemaId_userId: {
          cinemaId: createReviewDto.cinemaId,
          userId,
        },
      },
    });

    if (existingReview) {
      throw new ConflictException('You have already reviewed this cinema');
    }

    return this.prisma.cinemaReview.create({
      data: {
        ...createReviewDto,
        userId,
      },
      include: {
        user: {
          select: { id: true, fullName: true },
        },
        cinema: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async update(id: string, userId: string, updateReviewDto: UpdateReviewDto) {
    const review = await this.prisma.cinemaReview.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    return this.prisma.cinemaReview.update({
      where: { id },
      data: updateReviewDto,
      include: {
        user: {
          select: { id: true, fullName: true },
        },
        cinema: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async delete(id: string, userId: string) {
    const review = await this.prisma.cinemaReview.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.cinemaReview.delete({ where: { id } });

    return { message: 'Review deleted successfully' };
  }
}
