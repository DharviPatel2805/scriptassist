import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheService } from './common/services/cache.service';
import { AuthModule } from './modules/auth/auth.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';
import { ScheduledTasksModule } from './queues/scheduled-tasks/scheduled-tasks.module';
import { TaskProcessorModule } from './queues/task-processor/task-processor.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: '127.0.0.1',
          port: 6379,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          retryStrategy: () => null,
        },
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: true,
        },
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: 60,
          limit: 10,
        },
      ],
    }),

    // Feature modules
    UsersModule,
    TasksModule,
    AuthModule,

    // Queue processing modules
    TaskProcessorModule,
    ScheduledTasksModule,
  ],
  providers: [
    // Inefficient: Global cache service with no configuration options
    // This creates a single in-memory cache instance shared across all modules
    CacheService,
  ],
  exports: [
    // Exporting the cache service makes it available to other modules
    // but creates tight coupling
    CacheService,
  ],
})
export class AppModule {}
