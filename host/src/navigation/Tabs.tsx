import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CalendarBlank, Ticket } from 'phosphor-react-native';
import type { TabParamList } from './types';
import { EventsListScreen } from '../screens/EventsListScreen';
import { ReservationsListScreen } from '../screens/ReservationsListScreen';
import { fonts, withAlpha } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

const Tab = createBottomTabNavigator<TabParamList>();

export function Tabs() {
  const { colors } = useTheme();
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.bg,
        borderTopColor: colors.divider,
        height: 84,
        paddingTop: 8,
      },
      tabBarLabelStyle: { fontFamily: fonts.body, fontSize: 11 },
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: withAlpha(colors.text, 60),
    }),
    [colors]
  );

  return (
    <Tab.Navigator screenOptions={screenOptions}>
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
