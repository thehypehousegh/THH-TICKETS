import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Unsubscribe } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import {
  createEvent as createEventQuery,
  deleteCode as deleteCodeQuery,
  deleteEvent as deleteEventQuery,
  generateCodes as generateCodesQuery,
  setCodeUsed as setCodeUsedQuery,
  setEventStatus as setEventStatusQuery,
  updateEvent as updateEventQuery,
  watchEventBatches,
  watchHostEvents,
} from './queries';
import type { BatchRecord, EventRecord, EventStatus, NewEventInput, TicketSelection } from './types';

interface DataContextValue {
  loading: boolean;
  events: EventRecord[];
  batches: BatchRecord[];
  getEvent: (id: string) => EventRecord | undefined;
  getBatch: (id: string) => BatchRecord | undefined;
  batchesForEvent: (eventId: string) => BatchRecord[];
  createEvent: (input: NewEventInput) => Promise<EventRecord>;
  updateEventData: (eventId: string, input: NewEventInput) => Promise<void>;
  setEventStatusData: (eventId: string, status: EventStatus) => Promise<void>;
  generateCodes: (eventId: string, person: string, contact: string, email: string, selections: TicketSelection[]) => Promise<BatchRecord>;
  setCodeUsed: (eventId: string, codeId: string, used: boolean) => Promise<void>;
  deleteCodeData: (eventId: string, batchId: string, codeId: string) => Promise<void>;
  deleteEventData: (eventId: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [batchesByEvent, setBatchesByEvent] = useState<Record<string, BatchRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const listenersRef = useRef<Map<string, Unsubscribe>>(new Map());

  useEffect(() => {
    if (!user) {
      setEvents([]);
      setBatchesByEvent({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = watchHostEvents(user.uid, (next) => {
      setEvents(next);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // Keep one batches/codes listener alive per event this host currently has,
  // torn down as soon as an event disappears (deleted, or signed out).
  useEffect(() => {
    const listeners = listenersRef.current;
    const currentIds = new Set(events.map((e) => e.id));

    for (const [eventId, unsub] of listeners) {
      if (!currentIds.has(eventId)) {
        unsub();
        listeners.delete(eventId);
        setBatchesByEvent((prev) => {
          const { [eventId]: _drop, ...rest } = prev;
          return rest;
        });
      }
    }

    for (const eventId of currentIds) {
      if (listeners.has(eventId)) continue;
      const unsub = watchEventBatches(eventId, (batches) => {
        setBatchesByEvent((prev) => ({ ...prev, [eventId]: batches }));
      });
      listeners.set(eventId, unsub);
    }
  }, [events]);

  useEffect(() => {
    return () => {
      listenersRef.current.forEach((unsub) => unsub());
      listenersRef.current.clear();
    };
  }, []);

  const batches = useMemo(() => Object.values(batchesByEvent).flat(), [batchesByEvent]);
  const getEvent = (id: string) => events.find((e) => e.id === id);
  const getBatch = (id: string) => batches.find((b) => b.id === id);
  const batchesForEvent = (eventId: string) => batchesByEvent[eventId] ?? [];

  const createEvent = async (input: NewEventInput) => {
    if (!user) throw new Error('Not signed in');
    return createEventQuery(user.uid, input);
  };

  const updateEventData = async (eventId: string, input: NewEventInput) => {
    await updateEventQuery(eventId, input);
  };

  const setEventStatusData = async (eventId: string, status: EventStatus) => {
    await setEventStatusQuery(eventId, status);
  };

  const generateCodes = async (eventId: string, person: string, contact: string, email: string, selections: TicketSelection[]) => {
    const event = getEvent(eventId);
    if (!event) throw new Error('Event not found');
    return generateCodesQuery(event, person, contact, email, selections);
  };

  const setCodeUsed = async (eventId: string, codeId: string, used: boolean) => {
    await setCodeUsedQuery(eventId, codeId, used, user?.uid ?? null);
  };

  const deleteCodeData = async (eventId: string, batchId: string, codeId: string) => {
    await deleteCodeQuery(eventId, batchId, codeId);
  };

  const deleteEventData = async (eventId: string) => {
    await deleteEventQuery(eventId);
  };

  const value: DataContextValue = {
    loading,
    events,
    batches,
    getEvent,
    getBatch,
    batchesForEvent,
    createEvent,
    updateEventData,
    setEventStatusData,
    generateCodes,
    setCodeUsed,
    deleteCodeData,
    deleteEventData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
