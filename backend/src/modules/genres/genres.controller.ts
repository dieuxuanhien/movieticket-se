import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { GenresService } from './genres.service';
import { CreateGenreDto, UpdateGenreDto } from './dto/genre.dto';
import { ClerkGuard } from '../../common/guards/clerk.guard';
import { RoleGuard, Roles } from '../../common/guards/role.guard';
import { UserRole } from '../../common/constants/app.constants';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('genres')
@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @Get()
  @ApiOperation({ summary: 'Get all genres' })
  @ApiResponse({ status: 200, description: 'List of genres' })
  async findAll() {
    return this.genresService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get genre by ID' })
  @ApiResponse({ status: 200, description: 'Genre details' })
  async findOne(@Param('id') id: string) {
    return this.genresService.findById(id);
  }

  @Post()
  @UseGuards(ClerkGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new genre (Admin only)' })
  @ApiResponse({ status: 201, description: 'Genre created' })
  async create(@Body() createGenreDto: CreateGenreDto) {
    return this.genresService.create(createGenreDto);
  }

  @Put(':id')
  @UseGuards(ClerkGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a genre (Admin only)' })
  @ApiResponse({ status: 200, description: 'Genre updated' })
  async update(
    @Param('id') id: string,
    @Body() updateGenreDto: UpdateGenreDto,
  ) {
    return this.genresService.update(id, updateGenreDto);
  }

  @Delete(':id')
  @UseGuards(ClerkGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a genre (Admin only)' })
  @ApiResponse({ status: 200, description: 'Genre deleted' })
  async delete(@Param('id') id: string) {
    return this.genresService.delete(id);
  }
}
