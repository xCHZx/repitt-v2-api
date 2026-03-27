import { Module } from '@nestjs/common';
import { FlyerService } from './flyer.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [FlyerService],
  exports: [FlyerService],
})
export class FlyerModule {}
