import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { CacheService } from '../../common/services/cache.service';
import { TaskStatus } from './enums/task-status.enum';
import {
  ITask,
  ITaskCreate,
  ITaskFilter,
  ITaskStats,
  ITaskUpdate,
} from './interfaces/task.interface';
import { TaskRepository } from './repositories/task.repository';

@Injectable()
export class TasksService {
  constructor(
    private readonly taskRepository: TaskRepository,
    @InjectQueue('task-processing')
    private readonly taskQueue: Queue,
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
  ) {}

  private getCacheKey(id: string): string {
    return `task:${id}`;
  }

  private getStatsCacheKey(): string {
    return 'tasks:stats';
  }

  async create(data: ITaskCreate): Promise<ITask> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const task = await this.taskRepository.create(data);
      await this.taskQueue.add('task-status-update', {
        taskId: task.id,
        status: task.status,
      });

      await queryRunner.commitTransaction();
      await this.cacheService.invalidatePattern('tasks:*');
      return task;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(filter: ITaskFilter): Promise<{ data: ITask[]; count: number }> {
    const cacheKey = `tasks:list:${JSON.stringify(filter)}`;
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.taskRepository.findAll(filter),
      300, // 5 minutes cache
    );
  }

  async findOne(id: string): Promise<ITask> {
    const cacheKey = this.getCacheKey(id);
    return this.cacheService.getOrSet(cacheKey, () => this.taskRepository.findById(id), 300);
  }

  async update(id: string, data: ITaskUpdate): Promise<ITask> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const task = await this.taskRepository.findById(id);
      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      const updatedTask = await this.taskRepository.update(id, data);
      if (data.status && task.status !== data.status) {
        await this.taskQueue.add('task-status-update', {
          taskId: id,
          status: data.status,
        });
      }

      await queryRunner.commitTransaction();
      await this.cacheService.del(this.getCacheKey(id));
      await this.cacheService.invalidatePattern('tasks:*');
      return updatedTask;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const task = await this.taskRepository.findById(id);
      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      await this.taskRepository.delete(id);
      await queryRunner.commitTransaction();
      await this.cacheService.del(this.getCacheKey(id));
      await this.cacheService.invalidatePattern('tasks:*');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getStats(): Promise<ITaskStats> {
    return this.cacheService.getOrSet(
      this.getStatsCacheKey(),
      () => this.taskRepository.getStats(),
      60, // 1 minute cache
    );
  }

  async batchProcess(operations: { tasks: string[]; action: string }): Promise<any[]> {
    const { tasks: taskIds, action } = operations;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const results = [];
      switch (action) {
        case 'complete':
          await this.taskRepository.batchUpdate(taskIds, { status: TaskStatus.COMPLETED });
          results.push(...taskIds.map(id => ({ taskId: id, success: true })));
          break;
        case 'delete':
          await this.taskRepository.batchDelete(taskIds);
          results.push(...taskIds.map(id => ({ taskId: id, success: true })));
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      await queryRunner.commitTransaction();
      await Promise.all([
        ...taskIds.map(id => this.cacheService.del(this.getCacheKey(id))),
        this.cacheService.invalidatePattern('tasks:*'),
      ]);
      return results;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateStatus(id: string, status: TaskStatus): Promise<ITask> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const task = await this.taskRepository.findById(id);
      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      const updatedTask = await this.taskRepository.update(id, { status });
      await this.taskQueue.add('task-status-update', {
        taskId: id,
        status,
      });

      await queryRunner.commitTransaction();
      return updatedTask;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
