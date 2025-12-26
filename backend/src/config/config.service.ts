import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get port(): number {
    return this.configService.get<number>('port');
  }

  get supabaseUrl(): string {
    return this.configService.get<string>('supabase.url');
  }

  get supabaseKey(): string {
    return this.configService.get<string>('supabase.key');
  }

  get supabaseServiceKey(): string {
    return process.env.SUPABASE_SERVICE_KEY;
  }

  get supabaseJwtSecret(): string {
    return process.env.SUPABASE_JWT_SECRET;
  }

  // Clerk Configuration
  get clerkPublishableKey(): string {
    return this.configService.get<string>('clerk.publishableKey');
  }

  get clerkSecretKey(): string {
    return this.configService.get<string>('clerk.secretKey');
  }

  get clerkWebhookSecret(): string {
    return this.configService.get<string>('clerk.webhookSecret');
  }

  get clerkFrontendUrl(): string {
    return this.configService.get<string>('clerk.frontendUrl');
  }

  get databaseUrl(): string {
    return this.configService.get<string>('database.url');
  }

  get paymentWebhookSecret(): string {
    return process.env.PAYMENT_WEBHOOK_SECRET;
  }

  get seatLockDurationMinutes(): number {
    return parseInt(process.env.SEAT_LOCK_DURATION_MINUTES || '10', 10);
  }

  // VNPAY Configuration
  get vnpayTmnCode(): string {
    return process.env.VNPAY_TMN_CODE;
  }

  get vnpaySecureSecret(): string {
    return process.env.VNPAY_SECURE_SECRET;
  }

  get vnpayHost(): string {
    return process.env.VNPAY_HOST;
  }

  get vnpayApi(): string {
    return (
      process.env.VNPAY_API ||
      'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction'
    );
  }

  get vnpayReturnUrl(): string {
    return (
      process.env.VNPAY_RETURN_URL ||
      'http://localhost:3000/api/bookings/vnpay/return'
    );
  }

  get vnpayIpnUrl(): string {
    return (
      process.env.VNPAY_IPN_URL ||
      'http://localhost:3000/api/bookings/vnpay/ipn'
    );
  }

  get vnpayTestMode(): boolean {
    return process.env.VNPAY_TEST_MODE === 'true';
  }

  get appUrl(): string {
    return process.env.APP_URL || 'http://localhost:3000';
  }

  get frontendUrl(): string {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }
}
