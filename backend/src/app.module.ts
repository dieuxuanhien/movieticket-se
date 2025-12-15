import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { SupabaseModule } from './infrastructure/supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MoviesModule } from './modules/movies/movies.module';
import { GenresModule } from './modules/genres/genres.module';
import { CinemasModule } from './modules/cinemas/cinemas.module';
import { HallsModule } from './modules/halls/halls.module';
import { SeatsModule } from './modules/seats/seats.module';
import { ShowtimesModule } from './modules/showtimes/showtimes.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { ConcessionsModule } from './modules/concessions/concessions.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    PrismaModule,
    SupabaseModule,
    AuthModule,
    UsersModule,
    MoviesModule,
    GenresModule,
    CinemasModule,
    HallsModule,
    SeatsModule,
    ShowtimesModule,
    BookingsModule,
    TicketsModule,
    ConcessionsModule,
    ReviewsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
