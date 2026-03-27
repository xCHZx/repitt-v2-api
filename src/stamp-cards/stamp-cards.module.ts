import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { StampCardsController } from './stamp-cards.controller';
import { StampCardsService } from './stamp-cards.service';

@Module({
  imports: [SupabaseModule],
  providers: [StampCardsService],
  controllers: [StampCardsController],
})
export class StampCardsModule {}
