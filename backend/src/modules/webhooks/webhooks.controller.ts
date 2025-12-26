import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  BadRequestException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('clerk')
  @HttpCode(200)
  @ApiExcludeEndpoint() // Hide from Swagger docs (webhook endpoint)
  @ApiOperation({ summary: 'Handle Clerk webhooks' })
  async handleClerkWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: any,
    @Headers() headers: any,
  ): Promise<{ success: boolean }> {
    try {
      // Get raw body for signature verification
      const rawBody = JSON.stringify(body);

      // Verify webhook signature
      const payload = this.webhooksService.verifyWebhook(rawBody, headers);

      const { type, data } = payload;

      // Handle different event types
      switch (type) {
        case 'user.created':
          await this.webhooksService.handleUserCreated(data);
          break;
        case 'user.updated':
          await this.webhooksService.handleUserUpdated(data);
          break;
        case 'user.deleted':
          await this.webhooksService.handleUserDeleted(data);
          break;
        default:
          console.log('Unhandled webhook type:', type);
      }

      return { success: true };
    } catch (error) {
      console.error('Webhook processing error:', error);
      throw new BadRequestException('Webhook processing failed');
    }
  }
}
