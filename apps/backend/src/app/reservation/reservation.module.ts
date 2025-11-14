import { Module } from '@nestjs/common';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { SupabaseModule } from '../supabase/supabase.module';
import {AuthModule} from "../auth/auth.module";

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [ReservationController],
  providers: [ReservationService],
  exports: [ReservationService],
})
export class ReservationModule {}
