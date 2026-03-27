import { Module } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { BusinessesController } from './businesses.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { FlyerModule } from '../flyer/flyer.module';

@Module({
  imports: [SupabaseModule, FlyerModule],
  controllers: [BusinessesController],
  providers: [BusinessesService],
})
export class BusinessesModule {}
