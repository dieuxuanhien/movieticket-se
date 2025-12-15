/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { MovieFormat, SeatType } from '../../../common/constants/app.constants';

export class TicketPricingDto {
  @ApiProperty({
    enum: SeatType,
    description: 'Seat type for this pricing',
    example: SeatType.STANDARD,
  })
  @IsEnum(SeatType)
  seatType: SeatType;

  @ApiProperty({
    example: 80000,
    description: 'Price for this seat type (in VND)',
  })
  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateShowtimeDto {
  @ApiProperty({
    description: 'Movie ID',
    example: 'uuid-of-movie',
  })
  @IsString()
  movieId: string;

  @ApiProperty({
    description: 'Cinema ID',
    example: 'uuid-of-cinema',
  })
  @IsString()
  cinemaId: string;

  @ApiProperty({
    description: 'Hall ID',
    example: 'uuid-of-hall',
  })
  @IsString()
  hallId: string;

  @ApiProperty({
    example: '2024-12-25T14:00:00.000Z',
    description: 'Showtime start time (ISO 8601 format)',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    enum: MovieFormat,
    example: MovieFormat.TWO_D,
    description: 'Movie format',
  })
  @IsEnum(MovieFormat)
  format: MovieFormat;

  @ApiProperty({
    type: [TicketPricingDto],
    description: 'Pricing for different seat types',
    example: [
      { seatType: 'STANDARD', price: 80000 },
      { seatType: 'VIP', price: 120000 },
      { seatType: 'COUPLE', price: 200000 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketPricingDto)
  pricing: TicketPricingDto[];
}

export class UpdateShowtimeDto extends PartialType(CreateShowtimeDto) {}
