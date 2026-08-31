import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { Tabs } from './Tabs';
import { CreateEventScreen } from '../screens/CreateEventScreen';
import { EditEventScreen } from '../screens/EditEventScreen';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { GenerateScreen } from '../screens/GenerateScreen';
import { OutputScreen } from '../screens/OutputScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { DiscountsScreen } from '../screens/DiscountsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { colors } from '../theme/tokens';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
      <Stack.Screen name="EditEvent" component={EditEventScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="Generate" component={GenerateScreen} />
      <Stack.Screen name="Output" component={OutputScreen} />
      <Stack.Screen name="Scan" component={ScanScreen} options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="Discounts" component={DiscountsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Admin" component={AdminScreen} />
    </Stack.Navigator>
  );
}
