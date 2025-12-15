import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Guard to ensure staff/manager can only access data from their assigned cinema
 */
@Injectable()
export class CinemaAccessGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Admins have global access
    if (user?.role === 'ADMIN') {
      return true;
    }

    // For MANAGER and STAFF, check cinema assignment
    if (user?.role === 'MANAGER' || user?.role === 'STAFF') {
      if (!user.cinemaId) {
        throw new ForbiddenException('User is not assigned to any cinema');
      }

      // Get cinemaId from request params or body
      const requestCinemaId =
        request.params?.cinemaId ||
        request.body?.cinemaId ||
        request.query?.cinemaId;

      // If a specific cinema is requested, verify access
      if (requestCinemaId && requestCinemaId !== user.cinemaId) {
        throw new ForbiddenException(
          'You can only access data from your assigned cinema',
        );
      }

      // Attach user's cinemaId to request for controllers to use
      request.allowedCinemaId = user.cinemaId;
    }

    return true;
  }
}
