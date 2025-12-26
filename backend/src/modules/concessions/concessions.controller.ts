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
import { ConcessionsService } from './concessions.service';
import { CreateConcessionDto, UpdateConcessionDto } from './dto/concession.dto';
import { ClerkGuard } from '../../common/guards/clerk.guard';
import { RoleGuard, Roles } from '../../common/guards/role.guard';
import { UserRole } from '../../common/constants/app.constants';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('concessions')
@Controller('concessions')
export class ConcessionsController {
  constructor(private readonly concessionsService: ConcessionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all concession items' })
  @ApiQuery({ name: 'cinemaId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of concession items' })
  async findAll(@Query('cinemaId') cinemaId?: string) {
    return this.concessionsService.findAll(cinemaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get concession by ID' })
  @ApiResponse({ status: 200, description: 'Concession details' })
  async findOne(@Param('id') id: string) {
    return this.concessionsService.findById(id);
  }

  @Post()
  @UseGuards(ClerkGuard, RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new concession item (Admin/Manager)' })
  @ApiResponse({ status: 201, description: 'Concession created' })
  async create(@Body() createConcessionDto: CreateConcessionDto) {
    return this.concessionsService.create(createConcessionDto);
  }

  @Put(':id')
  @UseGuards(ClerkGuard, RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a concession item (Admin/Manager)' })
  @ApiResponse({ status: 200, description: 'Concession updated' })
  async update(
    @Param('id') id: string,
    @Body() updateConcessionDto: UpdateConcessionDto,
  ) {
    return this.concessionsService.update(id, updateConcessionDto);
  }

  @Delete(':id')
  @UseGuards(ClerkGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a concession item (Admin only)' })
  @ApiResponse({ status: 200, description: 'Concession deleted' })
  async delete(@Param('id') id: string) {
    return this.concessionsService.delete(id);
  }
}
