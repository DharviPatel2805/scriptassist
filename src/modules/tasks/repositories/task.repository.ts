import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { TaskPriority } from '../enums/task-priority.enum';
import { TaskStatus } from '../enums/task-status.enum';
import {
  ITask,
  ITaskCreate,
  ITaskFilter,
  ITaskStats,
  ITaskUpdate,
} from '../interfaces/task.interface';

@Injectable()
export class TaskRepository {
  constructor(
    @InjectRepository(Task)
    private readonly repository: Repository<Task>,
  ) {}

  async create(data: ITaskCreate): Promise<ITask> {
    const task = this.repository.create(data);
    return this.repository.save(task);
  }

  async findById(id: string): Promise<ITask> {
    const task = await this.repository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  async findAll(filter: ITaskFilter): Promise<{ data: ITask[]; count: number }> {
    const { page = 1, limit = 10, status, priority } = filter;

    const queryBuilder = this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.user', 'user')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    if (priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority });
    }

    const [data, count] = await queryBuilder.getManyAndCount();
    return { data, count };
  }

  async update(id: string, data: ITaskUpdate): Promise<ITask> {
    await this.repository.update(id, data);
    const task = await this.findById(id);
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found after update`);
    }
    return task;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async getStats(): Promise<ITaskStats> {
    const [total, completed, inProgress, pending, highPriority] = await Promise.all([
      this.repository.count(),
      this.repository.count({ where: { status: TaskStatus.COMPLETED } }),
      this.repository.count({ where: { status: TaskStatus.IN_PROGRESS } }),
      this.repository.count({ where: { status: TaskStatus.PENDING } }),
      this.repository.count({ where: { priority: TaskPriority.HIGH } }),
    ]);

    return {
      total,
      completed,
      inProgress,
      pending,
      highPriority,
    };
  }

  async batchUpdate(ids: string[], data: Partial<ITask>): Promise<void> {
    await this.repository.update({ id: In(ids) }, data);
  }

  async batchDelete(ids: string[]): Promise<void> {
    await this.repository.delete({ id: In(ids) });
  }
}
