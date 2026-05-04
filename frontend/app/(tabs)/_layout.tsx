import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { theme } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.gold,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: { fontSize: 10, letterSpacing: 1.5, fontWeight: '600', textTransform: 'uppercase' },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'web' ? 'rgba(5,5,5,0.92)' : 'transparent',
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 82,
          paddingTop: 10,
          paddingBottom: 20,
        },
        tabBarBackground: Platform.OS === 'web' ? undefined : () => (
          <BlurView tint="dark" intensity={60} style={StyleSheet.absoluteFill}>
            <View style={{ flex: 1, backgroundColor: 'rgba(5,5,5,0.6)' }} />
          </BlurView>
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="sparkles-outline" activeName="sparkles" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="calendar-outline" activeName="calendar" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Journey',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="trophy-outline" activeName="trophy" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person-outline" activeName="person" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, activeName, color, focused }: any) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Ionicons name={focused ? activeName : name} size={22} color={color} />
      {focused && <View style={styles.dot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.gold, marginTop: 4, shadowColor: theme.gold, shadowOpacity: 0.8, shadowRadius: 4 },
});
