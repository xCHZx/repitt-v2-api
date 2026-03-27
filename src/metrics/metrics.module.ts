import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}
