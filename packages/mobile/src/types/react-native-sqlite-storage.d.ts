/**
 * react-native-sqlite-storage 类型声明
 */

declare module 'react-native-sqlite-storage' {
  export interface SQLiteResultSet {
    insertId: number;
    rowsAffected: number;
    rows: {
      length: number;
      item(index: number): any;
    };
  }

  export interface SQLiteDatabase {
    executeSql(sql: string, params?: any[]): Promise<[SQLiteResultSet]>;
    close(): Promise<void>;
  }

  export interface SQLiteParams {
    name: string;
    location?: 'default' | 'Documents' | 'Library';
  }

  const SQLite: {
    openDatabase(params: SQLiteParams): Promise<SQLiteDatabase>;
    DEBUG(enable: boolean): void;
    enablePromise(enable: boolean): void;
  };

  export default SQLite;
  export type { SQLiteDatabase, SQLiteResultSet };
}

