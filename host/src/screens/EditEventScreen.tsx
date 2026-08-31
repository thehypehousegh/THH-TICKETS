import React from 'react';
import { Text } from 'react-native';
import type { RootScreenProps } from '../navigation/types';
import { Screen } from '../components/Screen';
import { BackButton } from '../components/BackButton';
import { EventForm } from '../components/EventForm';
import { useData } from '../data/DataContext';
import { useToast } from '../components/Toast';

type Props = RootScreenProps<'EditEvent'>;

export function EditEventScreen({ route, navigation }: Props) {
  const { eventId } = route.params;
  const { getEvent, updateEventData } = useData();
  const { flash } = useToast();
  const event = getEvent(eventId);

  if (!event) {
    return (
      <Screen>
        <BackButton label="Back" onPress={() => navigation.goBack()} />
        <Text>Event not found.</Text>
      </Screen>
    );
  }

  return (
    <EventForm
      title="Edit event"
      submitLabel="Save changes"
      existingEvent={event}
      onBack={() => navigation.goBack()}
      onSubmit={async (input) => {
        await updateEventData(event.id, input);
        flash('Event updated');
        navigation.goBack();
      }}
    />
  );
}
