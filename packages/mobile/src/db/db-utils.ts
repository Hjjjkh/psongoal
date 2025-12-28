/**
 * SQLite 数据库工具函数
 */

import SQLite, { type SQLiteDatabase } from 'react-native-sqlite-storage';

SQLite.DEBUG(true);
SQLite.enablePromise(true);

let db: SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLiteDatabase> => {
  if (db) {
    return db;
  }

  db = await SQLite.openDatabase({
    name: 'psongoal.db',
    location: 'default',
  });

  return db;
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.close();
    db = null;
  }
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getToday = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

export const formatDate = (date: Date | string): string => {
  if (typeof date === 'string') {
    return date;
  }
  return date.toISOString().split('T')[0];
};

export const formatTimestamp = (date?: Date | string): string => {
  if (!date) {
    return new Date().toISOString();
  }
  if (typeof date === 'string') {
    return date;
  }
  return date.toISOString();
};

