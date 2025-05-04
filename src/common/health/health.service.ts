import { Injectable, Logger } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService extends HealthIndicator {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly taskQueue: Queue,
  ) {
    super();
  }

  async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      await this.dataSource.query('SELECT 1');
      return this.getStatus('database', true);
    } catch (error) {
      this.logger.error('Database health check failed', error);
      throw new HealthCheckError('Database check failed', error);
    }
  }

  async checkQueue(): Promise<HealthIndicatorResult> {
    try {
      await this.taskQueue.getJobCounts();
      return this.getStatus('queue', true);
    } catch (error) {
      this.logger.error('Queue health check failed', error);
      throw new HealthCheckError('Queue check failed', error);
    }
  }

  async checkAll(): Promise<HealthIndicatorResult> {
    const database = await this.checkDatabase();
    const queue = await this.checkQueue();

    return {
      ...database,
      ...queue,
    };
  }
}
