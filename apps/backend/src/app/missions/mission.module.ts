import { Module } from '@nestjs/common';
import { MissionController } from './mission.controller';
import { MissionService } from './mission.service';
import { PayloadModule } from '../payload/payload.module';

@Module({
  imports: [PayloadModule],
  controllers: [MissionController],
  providers: [MissionService],
  exports: [MissionService],
})
export class MissionModule {}
