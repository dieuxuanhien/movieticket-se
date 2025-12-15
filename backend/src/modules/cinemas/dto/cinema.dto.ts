import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { SystemStatus } from '../../../common/constants/app.constants';

export class CreateCinemaDto {
  @ApiProperty({
    example: 'CGV Vincom Mega Mall',
    description: 'Cinema name',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: '72 Lê Thánh Tôn, Bến Nghé, Quận 1',
    description: 'Cinema address',
  })
  @IsString()
  address: string;

  @ApiProperty({
    example: 'Ho Chi Minh City',
    description: 'City where cinema is located',
  })
  @IsString()
  city: string;

  @ApiPropertyOptional({
    enum: SystemStatus,
    default: SystemStatus.ACTIVE,
    description: 'Cinema status',
  })
  @IsOptional()
  @IsEnum(SystemStatus)
  status?: SystemStatus;
}

export class UpdateCinemaDto extends PartialType(CreateCinemaDto) {}
