import { Injectable, Logger } from '@nestjs/common';
import { Webhook } from 'svix';
import { ConfigService } from '../../config/config.service';
import { ClerkService } from '../../infrastructure/clerk/clerk.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly webhook: Webhook;

  constructor(
    private readonly configService: ConfigService,
    private readonly clerkService: ClerkService,
  ) {
    this.webhook = new Webhook(this.configService.clerkWebhookSecret);
  }

  /**
   * Verify webhook signature using Svix
   */
  verifyWebhook(payload: string, headers: any): any {
    try {
      return this.webhook.verify(payload, {
        'svix-id': headers['svix-id'],
        'svix-timestamp': headers['svix-timestamp'],
        'svix-signature': headers['svix-signature'],
      });
    } catch (error) {
      this.logger.error('Webhook verification failed:', error);
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Handle user.created event from Clerk
   * Automatically set default metadata if not already present
   */
  async handleUserCreated(data: any): Promise<void> {
    const userId = data.id;
    const email = data.email_addresses[0]?.email_address;
    const publicMetadata = data.public_metadata || {};

    this.logger.log('User created in Clerk', {
      userId,
      email,
      existingMetadata: publicMetadata,
    });

    // Check if user already has metadata (e.g., from programmatic creation)
    const hasMetadata = publicMetadata.role !== undefined;

    if (!hasMetadata) {
      // Set default metadata for new users who signed up via frontend
      const defaultMetadata = {
        role: 'USER',
        cinemaId: null,
        phone: data.phone_numbers?.[0]?.phone_number || null,
        fullName:
          `${data.first_name || ''} ${data.last_name || ''}`.trim() || null,
      };

      try {
        await this.clerkService.updateUserMetadata(userId, defaultMetadata);

        this.logger.log('✅ Default metadata set for new user', {
          userId,
          email,
          metadata: defaultMetadata,
        });
      } catch (error) {
        this.logger.error('❌ Failed to set default metadata', {
          userId,
          email,
          error: error.message,
        });
      }
    } else {
      this.logger.log('User already has metadata, skipping defaults', {
        userId,
        email,
        role: publicMetadata.role,
      });
    }

    // Add custom logic here if needed
    // Example: Send welcome email, analytics tracking, etc.
  }

  /**
   * Handle user.updated event from Clerk
   * Log user updates, trigger business logic if needed
   */
  async handleUserUpdated(data: any): Promise<void> {
    this.logger.log('User updated in Clerk', {
      userId: data.id,
      email: data.email_addresses[0]?.email_address,
      role: data.public_metadata?.role,
      cinemaId: data.public_metadata?.cinemaId,
    });

    // Add custom logic here if needed
    // Example: Update related records, send notifications, etc.
  }

  /**
   * Handle user.deleted event from Clerk
   * Log user deletion event
   */
  async handleUserDeleted(data: any): Promise<void> {
    this.logger.log('User deleted in Clerk', { userId: data.id });

    // Add custom logic here if needed
    // Example: Clean up orphaned records, send notifications, etc.
    // Note: Related bookings, reviews, etc. will remain with userId references
  }
}
