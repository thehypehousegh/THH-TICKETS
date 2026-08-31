import React from 'react';
import type { RootScreenProps } from '../navigation/types';
import { EventForm } from '../components/EventForm';
import { useData } from '../data/DataContext';
import { useToast } from '../components/Toast';

type Props = RootScreenProps<'CreateEvent'>;

export function CreateEventScreen({ navigation }: Props) {
  const { createEvent } = useData();
  const { flash } = useToast();

  return (
    <EventForm
      title="Create event"
      submitLabel="Create event"
      onBack={() => navigation.goBack()}
      onSubmit={async (input) => {
        const event = await createEvent(input);
        flash(`Event created · code tag ${event.abbr}`);
        navigation.replace('EventDetail', { eventId: event.id });
      }}
    />
  );
}
