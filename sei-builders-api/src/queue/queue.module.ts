import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { QUEUE_NAMES } from './queue.constants';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('queue.redis.host'),
          port: config.get<number>('queue.redis.port'),
          password: config.get<string>('queue.redis.password'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.NOTIFICATIONS },
      { name: QUEUE_NAMES.GITHUB_SYNC },
      { name: QUEUE_NAMES.ANALYTICS },
      { name: QUEUE_NAMES.EMAILS },
      { name: QUEUE_NAMES.WEBHOOKS },
      { name: QUEUE_NAMES.AUDIT },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
