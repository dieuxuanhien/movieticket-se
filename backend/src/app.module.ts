import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { ClerkModule } from './infrastructure/clerk/clerk.module';
import { AuthModule } from './modules/auth/auth.module';
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
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { HealthModule } from './health/health.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    PrismaModule,
    ClerkModule,
    AuthModule,
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
    WebhooksModule,
    HealthModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
