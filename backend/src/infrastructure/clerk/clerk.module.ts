import { Global, Module } from '@nestjs/common';
import { ClerkService } from './clerk.service';
import { ConfigModule } from '../../config/config.module';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ClerkService],
  exports: [ClerkService],
})
export class ClerkModule {}
