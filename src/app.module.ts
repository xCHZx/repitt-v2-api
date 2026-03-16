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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    StampCardsModule,
    VisitsModule,
    CatalogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
