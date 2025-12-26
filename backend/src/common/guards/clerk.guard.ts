import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ClerkService } from '../../infrastructure/clerk/clerk.service';

@Injectable()
export class ClerkGuard implements CanActivate {
  constructor(private readonly clerkService: ClerkService) {}

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
      // Verify JWT with Clerk
      const decoded = await this.clerkService.verifyToken(token);

      if (!decoded || !decoded.sub) {
        throw new UnauthorizedException('Invalid token');
      }

      const userId = decoded.sub;

      // Fetch user from Clerk to get metadata
      const clerkUser = await this.clerkService.getUser(userId);

      if (!clerkUser) {
        throw new UnauthorizedException('User not found in Clerk');
      }

      // Extract metadata from Clerk user
      const publicMetadata = clerkUser.publicMetadata as any;
      const primaryEmail = clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId,
      );

      // Attach user info to request
      // All user data now comes from Clerk, not database
      request.user = {
        id: userId,
        email: primaryEmail?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        fullName:
          publicMetadata?.fullName ||
          `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        phone:
          publicMetadata?.phone || clerkUser.phoneNumbers?.[0]?.phoneNumber,
        role: publicMetadata?.role || 'USER',
        cinemaId: publicMetadata?.cinemaId || null,
        clerkUser,
        publicMetadata,
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
