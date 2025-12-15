import { Injectable, Logger } from '@nestjs/common';
import {
  createClient,
  SupabaseClient,
  RealtimeChannel,
} from '@supabase/supabase-js';
import { ConfigService } from '../../config/config.service';

/**
 * @description This service is used to create and manage Supabase clients.
 * Services that need to interact with Supabase should inject this service.
 */
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient;
  private adminClient: SupabaseClient;

  constructor(private configService: ConfigService) {
    try {
      this.logger.log('Initializing Supabase clients');

      this.supabase = createClient(
        this.configService.supabaseUrl,
        this.configService.supabaseKey,
      );

      this.adminClient = createClient(
        this.configService.supabaseUrl,
        this.configService.supabaseServiceKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      );

      this.logger.log('Supabase clients initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Supabase clients:', error);
      throw error;
    }
  }

  /**
   * @description Get the regular Supabase client.
   * @returns {SupabaseClient} The Supabase client.
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * @description Get the admin Supabase client.
   * @returns {SupabaseClient} The admin Supabase client.
   */
  getAdminClient(): SupabaseClient {
    return this.adminClient;
  }

  /**
   * @description Subscribe to real-time changes on a table
   * @param tableName The name of the table to subscribe to
   * @param callback Function to call when changes occur
   * @returns {RealtimeChannel} The subscription channel
   */
  subscribeToTable(
    tableName: string,
    callback: (payload: any) => void,
  ): RealtimeChannel {
    return this.supabase
      .channel(`public:${tableName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        callback,
      )
      .subscribe();
  }

  /**
   * @description Unsubscribe from a channel
   * @param channel The channel to unsubscribe from
   */
  async unsubscribe(channel: RealtimeChannel): Promise<void> {
    await this.supabase.removeChannel(channel);
  }
}
