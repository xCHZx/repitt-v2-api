import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';

@Module({
  imports: [SupabaseModule],
  providers: [VisitsService],
  controllers: [VisitsController],
})
export class VisitsModule {}
