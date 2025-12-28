import React, {createContext, useContext, ReactNode} from 'react';
import SQLiteAdapter from '../db/sqlite-adapter';
import type {DatabaseAdapter} from '@psongoal/core';

interface DatabaseContextType {
  db: DatabaseAdapter;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

interface DatabaseProviderProps {
  children: ReactNode;
  userId: string;
}

export function DatabaseProvider({children, userId}: DatabaseProviderProps) {
  const db = React.useMemo(() => new SQLiteAdapter(userId), [userId]);

  return (
    <DatabaseContext.Provider value={{db}}>{children}</DatabaseContext.Provider>
  );
}

export function useDatabase(): DatabaseAdapter {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }
  return context.db;
}

