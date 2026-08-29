import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { fetchBatches, fetchEvents, insertBatch, insertEvent } from './queries';
import type { BatchRecord, EventRecord, NewEventInput, TicketSelection } from './types';

interface DataContextValue {
  loading: boolean;
  events: EventRecord[];
  batches: BatchRecord[];
  getEvent: (id: string) => EventRecord | undefined;
  getBatch: (id: string) => BatchRecord | undefined;
  batchesForEvent: (eventId: string) => BatchRecord[];
  createEvent: (input: NewEventInput) => Promise<EventRecord>;
  generateCodes: (eventId: string, person: string, selections: TicketSelection[]) => Promise<BatchRecord>;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [nextEvents, nextBatches] = await Promise.all([fetchEvents(db), fetchBatches(db)]);
    setEvents(nextEvents);
    setBatches(nextBatches);
  }, [db]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const getEvent = useCallback((id: string) => events.find((e) => e.id === id), [events]);
  const getBatch = useCallback((id: string) => batches.find((b) => b.id === id), [batches]);
  const batchesForEvent = useCallback(
    (eventId: string) => batches.filter((b) => b.eventId === eventId),
    [batches]
  );

  const createEvent = useCallback(
    async (input: NewEventInput) => {
      const event = await insertEvent(db, input);
      await refresh();
      return event;
    },
    [db, refresh]
  );

  const generateCodes = useCallback(
    async (eventId: string, person: string, selections: TicketSelection[]) => {
      const event = events.find((e) => e.id === eventId);
      if (!event) throw new Error('Event not found');
      const batch = await insertBatch(db, event, person, selections);
      await refresh();
      return batch;
    },
    [db, events, refresh]
  );

  const value = useMemo<DataContextValue>(
    () => ({ loading, events, batches, getEvent, getBatch, batchesForEvent, createEvent, generateCodes, refresh }),
    [loading, events, batches, getEvent, getBatch, batchesForEvent, createEvent, generateCodes, refresh]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
