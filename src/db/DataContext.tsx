import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import {
  fetchBatches,
  fetchEvents,
  getSetting,
  importEvent,
  insertBatch,
  insertEvent,
  isKnownHostKey,
  setCodeUsedAsync,
  setSetting,
  type EventImportPayload,
} from './queries';
import { DEVICE_ROLE_SETTING_KEY, isDeviceRole, type DeviceRole } from './role';
import type { BatchRecord, EventRecord, NewEventInput, TicketSelection } from './types';

interface DataContextValue {
  loading: boolean;
  events: EventRecord[];
  batches: BatchRecord[];
  deviceRole: DeviceRole | null;
  setDeviceRole: (role: DeviceRole) => Promise<void>;
  checkHostKey: (key: string) => Promise<boolean>;
  getEvent: (id: string) => EventRecord | undefined;
  getBatch: (id: string) => BatchRecord | undefined;
  batchesForEvent: (eventId: string) => BatchRecord[];
  createEvent: (input: NewEventInput) => Promise<EventRecord>;
  generateCodes: (eventId: string, person: string, selections: TicketSelection[]) => Promise<BatchRecord>;
  setCodeUsed: (codeId: string, used: boolean) => Promise<void>;
  importEventData: (payload: EventImportPayload) => Promise<string>;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [deviceRole, setDeviceRoleState] = useState<DeviceRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [nextEvents, nextBatches, roleSetting] = await Promise.all([
      fetchEvents(db),
      fetchBatches(db),
      getSetting(db, DEVICE_ROLE_SETTING_KEY),
    ]);
    setEvents(nextEvents);
    setBatches(nextBatches);
    setDeviceRoleState(isDeviceRole(roleSetting) ? roleSetting : null);
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

  const setDeviceRole = useCallback(
    async (role: DeviceRole) => {
      await setSetting(db, DEVICE_ROLE_SETTING_KEY, role);
      setDeviceRoleState(role);
    },
    [db]
  );

  const checkHostKey = useCallback((key: string) => isKnownHostKey(db, key), [db]);

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

  const setCodeUsed = useCallback(
    async (codeId: string, used: boolean) => {
      await setCodeUsedAsync(db, codeId, used);
      await refresh();
    },
    [db, refresh]
  );

  const importEventData = useCallback(
    async (payload: EventImportPayload) => {
      await importEvent(db, payload);
      await refresh();
      return payload.event.id;
    },
    [db, refresh]
  );

  const value = useMemo<DataContextValue>(
    () => ({
      loading,
      events,
      batches,
      deviceRole,
      setDeviceRole,
      checkHostKey,
      getEvent,
      getBatch,
      batchesForEvent,
      createEvent,
      generateCodes,
      setCodeUsed,
      importEventData,
      refresh,
    }),
    [
      loading,
      events,
      batches,
      deviceRole,
      setDeviceRole,
      checkHostKey,
      getEvent,
      getBatch,
      batchesForEvent,
      createEvent,
      generateCodes,
      setCodeUsed,
      importEventData,
      refresh,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
