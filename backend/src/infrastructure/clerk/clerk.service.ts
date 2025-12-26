import { Injectable, Logger } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import type { ClerkClient } from '@clerk/backend';
import { ConfigService } from '../../config/config.service';

export interface UserMetadata extends Record<string, any> {
  role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'USER';
  cinemaId?: string | null;
  phone?: string | null;
  fullName?: string | null;
}

@Injectable()
export class ClerkService {
  private readonly logger = new Logger(ClerkService.name);
  private readonly clerk: ClerkClient;

  constructor(private configService: ConfigService) {
    this.clerk = createClerkClient({
      secretKey: this.configService.clerkSecretKey,
    });
    this.logger.log('Clerk client initialized successfully');
  }

  getClient(): ClerkClient {
    return this.clerk;
  }

  /**
   * Verify JWT token from Authorization header
   * Returns the decoded token payload
   */
  async verifyToken(token: string): Promise<any> {
    try {
      const { verifyToken } = await import('@clerk/backend');
      const decoded = await verifyToken(token, {
        secretKey: this.configService.clerkSecretKey,
      });
      return decoded;
    } catch (error) {
      this.logger.error('Token verification failed:', error);
      throw error;
    }
  }

  /**
   * Get user by ID from Clerk
   */
  async getUser(userId: string) {
    return await this.clerk.users.getUser(userId);
  }

  /**
   * Get simplified user info for API responses
   * Returns only essential user information
   */
  async getUserInfo(userId: string): Promise<{
    id: string;
    email: string;
    fullName: string | null;
    phone: string | null;
    role: string;
    cinemaId: string | null;
  } | null> {
    try {
      const user = await this.clerk.users.getUser(userId);
      const metadata = user.publicMetadata as UserMetadata;

      return {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        fullName:
          metadata.fullName ||
          `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
          null,
        phone: metadata.phone || user.phoneNumbers[0]?.phoneNumber || null,
        role: metadata.role || 'USER',
        cinemaId: metadata.cinemaId || null,
      };
    } catch (error) {
      this.logger.error(`Failed to get user info for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get multiple users info in batch (for lists)
   */
  async getBatchUserInfo(userIds: string[]): Promise<Map<string, any>> {
    const userMap = new Map();
    
    // Remove duplicates
    const uniqueIds = [...new Set(userIds)];
    
    // Fetch all users in parallel
    const results = await Promise.allSettled(
      uniqueIds.map(id => this.getUserInfo(id))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        userMap.set(uniqueIds[index], result.value);
      }
    });

    return userMap;
  }

  /**
   * Get user list with optional pagination
   */
  async getUserList(params?: { limit?: number; offset?: number }) {
    return await this.clerk.users.getUserList(params);
  }

  /**
   * Update user metadata (public or private)
   */
  async updateUserMetadata(userId: string, metadata: Record<string, any>) {
    return await this.clerk.users.updateUserMetadata(userId, {
      publicMetadata: metadata,
    });
  }

  /**
   * Delete user from Clerk
   */
  async deleteUser(userId: string) {
    return await this.clerk.users.deleteUser(userId);
  }

  /**
   * Create a new user in Clerk (for API-based signup)
   */
  async createUser(params: {
    emailAddress: string[];
    password?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string[];
  }) {
    return await this.clerk.users.createUser(params);
  }

  /**
   * Create a user with metadata for seeding purposes
   * This is specifically designed for initial database seeding
   */
  async createUserWithMetadata(params: {
    email: string;
    password: string;
    fullName?: string;
    phone?: string;
    metadata: UserMetadata;
  }) {
    const { email, password, fullName, phone, metadata } = params;
    
    // Parse full name into first and last name
    const nameParts = fullName?.split(' ') || [];
    const firstName = nameParts[0] || undefined;
    const lastName = nameParts.slice(1).join(' ') || undefined;

    try {
      const user = await this.clerk.users.createUser({
        emailAddress: [email],
        password,
        firstName,
        lastName,
        phoneNumber: phone ? [phone] : undefined,
        publicMetadata: metadata,
        skipPasswordChecks: true, // Allow weak passwords for seeding
        skipPasswordRequirement: false,
      });

      this.logger.log(
        `Created user in Clerk: ${email} with role ${metadata.role}`,
      );
      return user;
    } catch (error) {
      this.logger.error(`Failed to create user ${email}:`, error);
      throw error;
    }
  }

  /**
   * Batch create users - useful for seeding
   */
  async batchCreateUsers(
    users: Array<{
      email: string;
      password: string;
      fullName?: string;
      phone?: string;
      metadata: UserMetadata;
    }>,
  ) {
    const results = [];
    const errors = [];

    for (const userData of users) {
      try {
        const user = await this.createUserWithMetadata(userData);
        results.push({ success: true, email: userData.email, userId: user.id });
      } catch (error) {
        errors.push({
          success: false,
          email: userData.email,
          error: error.message,
        });
        this.logger.error(`Failed to create user ${userData.email}:`, error);
      }
    }

    return {
      results,
      errors,
      successCount: results.length,
      errorCount: errors.length,
    };
  }

  /**
   * Delete all users (useful for cleaning up during seeding)
   * WARNING: This is destructive and should only be used in development
   */
  async deleteAllUsers() {
    this.logger.warn('⚠️  Deleting all users from Clerk...');
    
    let hasMore = true;
    let deletedCount = 0;

    while (hasMore) {
      const userList = await this.clerk.users.getUserList({ limit: 100 });
      
      for (const user of userList.data) {
        try {
          await this.clerk.users.deleteUser(user.id);
          deletedCount++;
        } catch (error) {
          this.logger.error(`Failed to delete user ${user.id}:`, error);
        }
      }

      hasMore = userList.data.length === 100;
    }

    this.logger.log(`Deleted ${deletedCount} users from Clerk`);
    return deletedCount;
  }
}
