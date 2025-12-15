import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  HallType,
  SeatType,
  SystemStatus,
} from '../../../common/constants/app.constants';

export class CreateHallDto {
  @ApiProperty({
    description: 'Cinema ID',
    example: 'uuid-of-cinema',
  })
  @IsString()
  cinemaId: string;

  @ApiProperty({
    example: 'Hall 1',
    description: 'Hall name',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    enum: HallType,
    default: HallType.STANDARD,
    description: 'Hall type',
  })
  @IsOptional()
  @IsEnum(HallType)
  type?: HallType;

  @ApiProperty({
    example: 150,
    description: 'Hall capacity (number of seats)',
  })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({
    enum: SystemStatus,
    default: SystemStatus.ACTIVE,
    description: 'Hall status',
  })
  @IsOptional()
  @IsEnum(SystemStatus)
  status?: SystemStatus;
}

export class UpdateHallDto extends PartialType(CreateHallDto) {}

export class RowSeatsDto {
  @ApiProperty({
    example: 'A',
    description: 'Row letter',
  })
  @IsString()
  rowLetter: string;

  @ApiProperty({
    example: 12,
    description: 'Number of seats in this row',
  })
  @IsInt()
  @Min(1)
  seatsCount: number;

  @ApiPropertyOptional({
    enum: SeatType,
    default: SeatType.STANDARD,
    description: 'Seat type for this row',
  })
  @IsOptional()
  @IsEnum(SeatType)
  seatType?: SeatType;
}

export class CreateSeatsDto {
  @ApiProperty({
    type: [RowSeatsDto],
    description: 'Array of row configurations',
    example: [
      { rowLetter: 'A', seatsCount: 10, seatType: 'STANDARD' },
      { rowLetter: 'B', seatsCount: 12, seatType: 'STANDARD' },
      { rowLetter: 'C', seatsCount: 12, seatType: 'VIP' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RowSeatsDto)
  rows: RowSeatsDto[];
}
