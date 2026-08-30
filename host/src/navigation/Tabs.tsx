import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CalendarBlank, Ticket } from 'phosphor-react-native';
import type { TabParamList } from './types';
import { EventsListScreen } from '../screens/EventsListScreen';
import { ReservationsListScreen } from '../screens/ReservationsListScreen';
import { colors, fonts } from '../theme/tokens';

const Tab = createBottomTabNavigator<TabParamList>();

export function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.divider,
          height: 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.body, fontSize: 11 },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: 'rgba(233,233,237,0.6)',
      }}
    >
      <Tab.Screen
        name="Events"
        component={EventsListScreen}
        options={{ tabBarIcon: ({ color, size }) => <CalendarBlank size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Reservations"
        component={ReservationsListScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ticket size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}
