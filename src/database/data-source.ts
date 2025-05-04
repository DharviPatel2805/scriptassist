import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { CreateInitialSchema1710752400000 } from './migrations/1710752400000-CreateInitialSchema';

// Load environment variables
dotenv.config();

// Debug logging
console.log('Database Configuration:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USERNAME:', process.env.DB_USERNAME);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'undefined');
console.log('DB_DATABASE:', process.env.DB_DATABASE);

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [CreateInitialSchema1710752400000],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
