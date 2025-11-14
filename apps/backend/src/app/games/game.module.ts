import { Module, Logger } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { PayloadModule } from '../payload/payload.module';

@Module({
  imports: [PayloadModule],
  controllers: [GameController],
  providers: [GameService, Logger],
  exports: [GameService],
})
export class GameModule {}
