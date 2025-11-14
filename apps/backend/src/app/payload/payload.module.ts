import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PayloadService } from './payload.service';

@Module({
  imports: [HttpModule],
  providers: [PayloadService],
  exports: [PayloadService],
})
export class PayloadModule {}
