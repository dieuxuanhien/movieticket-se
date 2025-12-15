import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateConcessionDto {
  @ApiProperty({
    example: 'Large Popcorn',
    description: 'Concession item name',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 50000,
    description: 'Price in VND',
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Cinema ID (null for global items)',
    example: 'uuid-of-cinema',
  })
  @IsOptional()
  @IsString()
  cinemaId?: string;
}

export class UpdateConcessionDto extends PartialType(CreateConcessionDto) {}
