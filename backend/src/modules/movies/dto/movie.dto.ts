import {
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  IsEnum,
  IsArray,
  IsUrl,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AgeRating } from '../../../common/constants/app.constants';

export class CreateMovieDto {
  @ApiProperty({
    example: 'Avatar: The Way of Water',
    description: 'Movie title',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: 'https://example.com/poster.jpg',
    description: 'URL to movie poster image',
  })
  @IsOptional()
  @IsUrl()
  posterUrl?: string;

  @ApiPropertyOptional({
    example: 'https://youtube.com/watch?v=xxxxx',
    description: 'URL to movie trailer',
  })
  @IsOptional()
  @IsUrl()
  trailerUrl?: string;

  @ApiProperty({
    example: 192,
    description: 'Movie runtime in minutes',
  })
  @IsInt()
  @Min(1)
  runtime: number;

  @ApiProperty({
    example: '2024-12-20',
    description: 'Movie release date',
  })
  @IsDateString()
  releaseDate: string;

  @ApiProperty({
    enum: AgeRating,
    example: AgeRating.T13,
    description: 'Age rating for the movie',
  })
  @IsEnum(AgeRating)
  ageRating: AgeRating;

  @ApiPropertyOptional({
    example: ['uuid-1', 'uuid-2'],
    description: 'Array of genre IDs',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genreIds?: string[];
}

export class UpdateMovieDto extends PartialType(CreateMovieDto) {}
