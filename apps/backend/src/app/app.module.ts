import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { ReservationModule } from './reservation/reservation.module';
import { AdminModule } from './admin/admin.module';
import { MissionModule } from './missions/mission.module';
import { SessionModule } from './sessions/session.module';
import { GameModule } from './games/game.module';
import { PayloadModule } from './payload/payload.module';
import { SupabaseModule } from './supabase/supabase.module';
import { ScratchCardModule } from './scratch-card/scratch-card.module';
import { PlayerResultModule } from './player-results/player-result.module';

@Module({
  imports: [
    AuthModule,
    GameModule,
    MissionModule,
    ProfileModule,
    PayloadModule,
    SupabaseModule,
    ScratchCardModule,
    ReservationModule,
    AdminModule,
    SessionModule,
    PlayerResultModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
