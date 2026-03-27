import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StampCardsModule } from './stamp-cards/stamp-cards.module';
import { VisitsModule } from './visits/visits.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { BusinessesModule } from './businesses/businesses.module';
import { SupabaseModule } from './supabase/supabase.module';
import { MetricsModule } from './metrics/metrics.module';
import { MailModule } from './mail/mail.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MailModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    StampCardsModule,
    VisitsModule,
    CatalogsModule,
    BusinessesModule,
    SupabaseModule,
    MetricsModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

