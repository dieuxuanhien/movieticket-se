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
import { MoviesService } from './movies.service';
import { CreateMovieDto, UpdateMovieDto } from './dto/movie.dto';
import { SupabaseGuard } from '../../common/guards/supabase.guard';
import { RoleGuard, Roles } from '../../common/guards/role.guard';
import { UserRole } from '../../common/constants/app.constants';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all movies' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'genreId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of movies' })
  async findAll(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('search') search?: string,
    @Query('genreId') genreId?: string,
  ) {
    return this.moviesService.findAll({ page, perPage }, search, genreId);
  }

  @Get('now-showing')
  @ApiOperation({ summary: 'Get currently showing movies' })
  @ApiResponse({ status: 200, description: 'List of now showing movies' })
  async getNowShowing() {
    return this.moviesService.getNowShowing();
  }

  @Get('coming-soon')
  @ApiOperation({ summary: 'Get upcoming movies' })
  @ApiResponse({ status: 200, description: 'List of upcoming movies' })
  async getComingSoon() {
    return this.moviesService.getComingSoon();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get movie by ID' })
  @ApiResponse({ status: 200, description: 'Movie details' })
  async findOne(@Param('id') id: string) {
    return this.moviesService.findById(id);
  }

  @Post()
  @UseGuards(SupabaseGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new movie (Admin only)' })
  @ApiResponse({ status: 201, description: 'Movie created' })
  async create(@Body() createMovieDto: CreateMovieDto) {
    return this.moviesService.create(createMovieDto);
  }

  @Put(':id')
  @UseGuards(SupabaseGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a movie (Admin only)' })
  @ApiResponse({ status: 200, description: 'Movie updated' })
  async update(
    @Param('id') id: string,
    @Body() updateMovieDto: UpdateMovieDto,
  ) {
    return this.moviesService.update(id, updateMovieDto);
  }

  @Delete(':id')
  @UseGuards(SupabaseGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a movie (Admin only)' })
  @ApiResponse({ status: 200, description: 'Movie deleted' })
  async delete(@Param('id') id: string) {
    return this.moviesService.delete(id);
  }

  @Get(':id/showtimes')
  @ApiOperation({ summary: 'Get showtimes for a movie' })
  @ApiQuery({ name: 'cinemaId', required: false, type: String })
  @ApiQuery({ name: 'date', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of showtimes' })
  async getShowtimes(
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
    @Query('date') date?: string,
  ) {
    return this.moviesService.getShowtimes(id, cinemaId, date);
  }
}
