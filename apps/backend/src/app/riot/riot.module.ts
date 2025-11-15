import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RiotService } from './riot.service';
import { RiotController } from './riot.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, AuthModule],
  providers: [RiotService],
  controllers: [RiotController],
  exports: [RiotService],
})
export class RiotModule {}

