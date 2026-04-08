import { drizzle, type AnyD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';

export const getDb = (d1: AnyD1Database) => drizzle(d1, { schema });
