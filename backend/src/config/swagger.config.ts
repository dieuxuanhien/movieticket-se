import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Cinema Booking System API')
  .setDescription(
    'API for Cinema Booking System with NestJS, Prisma, and Supabase',
  )
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter Supabase JWT token',
      in: 'header',
    },
    'JWT-auth',
  )
  .addTag('auth', 'Authentication endpoints')
  .addTag('users', 'User management endpoints')
  .addTag('movies', 'Movie management endpoints')
  .addTag('genres', 'Genre management endpoints')
  .addTag('cinemas', 'Cinema management endpoints')
  .addTag('halls', 'Hall management endpoints')
  .addTag('seats', 'Seat management endpoints')
  .addTag('showtimes', 'Showtime management endpoints')
  .addTag('bookings', 'Booking management endpoints')
  .addTag('tickets', 'Ticket management endpoints')
  .addTag('concessions', 'Concession management endpoints')
  .addTag('reviews', 'Review management endpoints')
  .addTag('health', 'Health check endpoints')
  .build();
