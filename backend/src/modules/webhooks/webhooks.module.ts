import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { ConfigModule } from '../../config/config.module';
import { ClerkModule } from '../../infrastructure/clerk/clerk.module';

@Module({
  imports: [ConfigModule, ClerkModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
