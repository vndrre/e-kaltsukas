import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/hooks/auth-provider';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function TabLayout() {
  const { theme } = useAppTheme();
  const { isHydrated, isAuthenticated } = useAuth();

  if (!isHydrated) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: [styles.tabBar, { backgroundColor: theme.background, borderTopColor: theme.border }],
        tabBarLabelStyle: styles.tabLabel,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="home" size={24} color={color} style={focused ? styles.filledIcon : undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <MaterialIcons name="travel-explore" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: 'Sell',
          tabBarButton: ({ onPress }) => (
            <Pressable accessibilityRole="button" onPress={onPress} style={styles.sellButtonContainer}>
              <View style={[styles.sellButton, { backgroundColor: theme.primary, shadowColor: theme.primary }]}>
                <MaterialIcons name="add" size={22} color={theme.textOnPrimary} />
              </View>
              <Text style={[styles.sellLabel, { color: theme.textMuted }]}>Sell</Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color }) => <MaterialIcons name="chat-bubble-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <MaterialIcons name="person-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: 74,
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  filledIcon: {
    opacity: 1,
  },
  sellButtonContainer: {
    alignItems: 'center',
    marginTop: -24,
  },
  sellButton: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    width: 44,
  },
  sellLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
});
