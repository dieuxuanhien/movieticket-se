import { Injectable, BadRequestException } from '@nestjs/common';
import { ClerkService } from '../../infrastructure/clerk/clerk.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CustomLoggerService } from '../../common/services/logger.service';
import { SignUpDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly clerkService: ClerkService,
    private readonly prismaService: PrismaService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger = new CustomLoggerService(AuthService.name);
  }

  /**
   * Note: With Clerk, sign up is handled on the frontend using Clerk components
   * This endpoint is for manual/API-based signup if needed
   * Most apps will use Clerk's <SignUp /> component
   */
  async signUp(signUpDto: SignUpDto) {
    try {
      this.logger.logAuth('Sign Up Attempt', {
        email: signUpDto.email,
        action: 'SIGN_UP',
      });

      // Create user in Clerk
      const clerkUser = await this.clerkService.createUser({
        emailAddress: [signUpDto.email],
        password: signUpDto.password,
        firstName: signUpDto.fullName?.split(' ')[0],
        lastName: signUpDto.fullName?.split(' ').slice(1).join(' '),
        phoneNumber: signUpDto.phone ? [signUpDto.phone] : undefined,
      });

      // Set default user metadata in Clerk
      await this.clerkService.updateUserMetadata(clerkUser.id, {
        role: 'USER',
        cinemaId: null,
        phone: signUpDto.phone || null,
        fullName: signUpDto.fullName || null,
      });

      this.logger.logAuth('Sign Up Success', {
        email: signUpDto.email,
        userId: clerkUser.id,
        action: 'SIGN_UP',
      });

      return {
        user: {
          id: clerkUser.id,
          email: signUpDto.email,
          fullName: signUpDto.fullName,
          phone: signUpDto.phone,
          role: 'USER',
        },
        message: 'User created successfully. Please sign in with Clerk.',
      };
    } catch (error) {
      this.logger.logError(error, {
        action: 'SIGN_UP',
        email: signUpDto.email,
      });
      throw new BadRequestException('Failed to sign up');
    }
  }

  /**
   * Get user profile
   * User is already authenticated by ClerkGuard
   */
  async getProfile(user: any) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      cinemaId: user.cinemaId,
      dbUser: user.dbUser,
    };
  }

  /**
   * Get user by token (for ClerkGuard)
  /**
   * Get user by token (for ClerkGuard)
   */
  async getUserByToken(token: string) {
    const decoded = await this.clerkService.verifyToken(token);
    const userId = decoded.sub;
    return await this.clerkService.getUser(userId);
  }
}
