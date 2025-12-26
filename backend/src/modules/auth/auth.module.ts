import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ClerkModule } from '../../infrastructure/clerk/clerk.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [ClerkModule, PrismaModule, CommonModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
