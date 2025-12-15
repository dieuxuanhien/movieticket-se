import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extract the current user from the request
 * This user object contains both Supabase auth info and database user info
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    // If a specific property is requested, return only that property
    if (data) {
      return user[data];
    }

    return user;
  },
);

/**
 * Extract only the database user from the request
 */
export const CurrentDbUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const dbUser = request.user?.dbUser;

    if (!dbUser) {
      return null;
    }

    if (data) {
      return dbUser[data];
    }

    return dbUser;
  },
);

/**
 * Extract the current user's ID from the request
 */
export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id;
  },
);

/**
 * Extract the current user's cinema ID from the request
 */
export const CurrentUserCinemaId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.cinemaId || null;
  },
);
