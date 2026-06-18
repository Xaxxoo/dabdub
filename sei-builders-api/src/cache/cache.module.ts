import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      isGlobal: true,
      useFactory: async (config: ConfigService) => {
        const { createKeyv } = await import('@keyv/redis');
        return {
          stores: [
            createKeyv(
              `redis://${config.get('redis.host')}:${config.get('redis.port')}`,
            ),
          ],
          ttl: config.get<number>('redis.ttl') ?? 3600,
          keyPrefix: config.get<string>('redis.keyPrefix') ?? 'sei:',
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class AppCacheModule {}
