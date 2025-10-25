// Unify storage layer with single shared Pool instance from src/db to avoid multiple open handles.
import {pool} from '../db';
import type {Pool} from 'pg';

export function getPool(): Pool {
    return pool;
}

export default getPool;
