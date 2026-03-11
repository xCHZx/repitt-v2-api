import { Module } from '@nestjs/common';
import { StampCardsService } from './stamp-cards.service';
import { StampCardsController } from './stamp-cards.controller';

@Module({
  providers: [StampCardsService],
  controllers: [StampCardsController]
})
export class StampCardsModule {}
