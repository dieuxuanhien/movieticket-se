import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CustomLoggerService } from '../../common/services/logger.service';
import { SignUpDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly prismaService: PrismaService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger = new CustomLoggerService(AuthService.name);
  }

  async signUp(signUpDto: SignUpDto) {
    try {
      this.logger.logAuth('Sign Up Attempt', {
        email: signUpDto.email,
        action: 'SIGN_UP',
      });

      const startTime = Date.now();

      // Create user in Supabase Auth
      const { data, error } = await this.supabaseService
        .getClient()
        .auth.signUp({
          email: signUpDto.email,
          password: signUpDto.password,
          options: {
            data: {
              full_name: signUpDto.fullName,
              phone: signUpDto.phone,
            },
          },
        });

      const duration = Date.now() - startTime;

      if (error) {
        this.logger.logError(new Error(error.message), {
          action: 'SIGN_UP',
          email: signUpDto.email,
          duration,
        });
        throw new BadRequestException(error.message);
      }

      if (!data.user) {
        throw new BadRequestException('Failed to create user');
      }

      // Create user in our database
      const dbUser = await this.prismaService.user.create({
        data: {
          id: data.user.id,
          email: signUpDto.email,
          fullName: signUpDto.fullName,
          phone: signUpDto.phone,
          role: 'USER',
        },
      });

      this.logger.logAuth('Sign Up Success', {
        email: signUpDto.email,
        userId: data.user.id,
        duration,
        action: 'SIGN_UP',
      });

      return {
        user: dbUser,
        session: data.session,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.logError(error, {
        action: 'SIGN_UP',
        email: signUpDto.email,
      });
      throw new BadRequestException('Failed to sign up');
    }
  }

  async signIn(email: string, password: string) {
    try {
      this.logger.logAuth('Sign In Attempt', { email, action: 'SIGN_IN' });

      const { data, error } = await this.supabaseService
        .getClient()
        .auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        this.logger.logError(new Error(error.message), {
          action: 'SIGN_IN',
          email,
        });
        throw new UnauthorizedException(error.message);
      }

      // Fetch user from database
      const dbUser = await this.prismaService.user.findUnique({
        where: { id: data.user.id },
        include: { cinema: true },
      });

      this.logger.logAuth('Sign In Success', {
        email,
        userId: data.user.id,
        action: 'SIGN_IN',
      });

      return {
        user: dbUser,
        session: data.session,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.logError(error, { action: 'SIGN_IN', email });
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async signOut(_token: string) {
    const { error } = await this.supabaseService.getClient().auth.signOut();

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return { message: 'Signed out successfully' };
  }

  async getProfile(user: any) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      dbUser: user.dbUser,
    };
  }

  async refreshToken(refreshToken: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.refreshSession({ refresh_token: refreshToken });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return {
      session: data.session,
    };
  }

  async getUser(token: string) {
    const {
      data: { user },
      error,
    } = await this.supabaseService.getClient().auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }
}
