import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

export const databaseProviders: Provider[] = [
  {
    provide: DATABASE_CONNECTION,
    useFactory: (configService: ConfigService) => {
      const dbUrl = configService.get<string>('DATABASE_URL');
      if (!dbUrl) {
        throw new Error(
          'DATABASE_URL is not defined in the environment variables',
        );
      }

      // Create a postgres connection for queries
      const queryClient = postgres(dbUrl);

      // Wrap it with Drizzle
      return drizzle(queryClient);
    },
    inject: [ConfigService],
  },
];
