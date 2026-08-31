import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureSignedIn } from './src/firebase/app';
import { fetchEvent } from './src/data/eventSync';
import { JoinScreen } from './src/screens/JoinScreen';
import { VerifyScreen } from './src/screens/VerifyScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import type { EventRecord } from './src/data/types';

const LAST_EVENT_KEY = 'thh-verifier-last-event-id';

function AppInner() {
  const { theme, colors } = useTheme();
  const [ready, setReady] = useState(false);
  const [myUid, setMyUid] = useState<string | null>(null);
  const [event, setEvent] = useState<EventRecord | null>(null);

  useEffect(() => {
    (async () => {
      const [uid, lastEventId] = await Promise.all([ensureSignedIn(), AsyncStorage.getItem(LAST_EVENT_KEY)]);
      setMyUid(uid);
      if (lastEventId) {
        const outcome = await fetchEvent(lastEventId);
        if (outcome.status === 'found') setEvent(outcome.event);
      }
      setReady(true);
    })();
  }, []);

  const onJoined = (nextEvent: EventRecord) => {
    setEvent(nextEvent);
    AsyncStorage.setItem(LAST_EVENT_KEY, nextEvent.id).catch(() => {});
  };

  const onLeave = () => {
    setEvent(null);
    AsyncStorage.removeItem(LAST_EVENT_KEY).catch(() => {});
  };

  if (!ready || !myUid) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      {event ? (
        <VerifyScreen event={event} myUid={myUid} onLeave={onLeave} />
      ) : (
        <JoinScreen onJoined={onJoined} />
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
