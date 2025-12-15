import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class SupabaseGuard implements CanActivate {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const {
        data: { user },
        error,
      } = await this.supabaseService.getClient().auth.getUser(token);

      if (error || !user) {
        throw new UnauthorizedException('Invalid token');
      }

      // Fetch user from database to get role and other info
      let dbUser = await this.prismaService.user.findUnique({
        where: { id: user.id },
        include: { cinema: true },
      });

      // If user doesn't exist in database, create them (first login sync)
      if (!dbUser) {
        dbUser = await this.prismaService.user.create({
          data: {
            id: user.id,
            email: user.email,
            fullName: user.user_metadata?.full_name || null,
            phone: user.user_metadata?.phone || null,
            role: 'USER',
          },
          include: { cinema: true },
        });
      }

      // Attach both Supabase user and DB user to the request
      request.user = {
        ...user,
        token,
        dbUser,
        role: dbUser.role,
        cinemaId: dbUser.cinemaId,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Auth error:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
