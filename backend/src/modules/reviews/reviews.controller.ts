import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { ClerkGuard } from '../../common/guards/clerk.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all reviews' })
  @ApiQuery({ name: 'cinemaId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of reviews' })
  async findAll(
    @Query('cinemaId') cinemaId?: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ) {
    return this.reviewsService.findAll(cinemaId, { page, perPage });
  }

  @Get('cinema/:cinemaId')
  @ApiOperation({ summary: 'Get reviews for a cinema' })
  @ApiResponse({ status: 200, description: 'List of cinema reviews' })
  async getByCinema(@Param('cinemaId') cinemaId: string) {
    return this.reviewsService.getByCinema(cinemaId);
  }

  @Get('cinema/:cinemaId/stats')
  @ApiOperation({ summary: 'Get review statistics for a cinema' })
  @ApiResponse({ status: 200, description: 'Review statistics' })
  async getCinemaStats(@Param('cinemaId') cinemaId: string) {
    return this.reviewsService.getCinemaStats(cinemaId);
  }

  @Get('my')
  @UseGuards(ClerkGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my reviews' })
  @ApiResponse({ status: 200, description: 'List of user reviews' })
  async getMyReviews(@CurrentUserId() userId: string) {
    return this.reviewsService.getUserReviews(userId);
  }

  @Post()
  @UseGuards(ClerkGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a review' })
  @ApiResponse({ status: 201, description: 'Review created' })
  async create(
    @CurrentUserId() userId: string,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.create(userId, createReviewDto);
  }

  @Put(':id')
  @UseGuards(ClerkGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a review' })
  @ApiResponse({ status: 200, description: 'Review updated' })
  async update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, userId, updateReviewDto);
  }

  @Delete(':id')
  @UseGuards(ClerkGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a review' })
  @ApiResponse({ status: 200, description: 'Review deleted' })
  async delete(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.reviewsService.delete(id, userId);
  }
}
