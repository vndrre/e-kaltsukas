import { Tabs } from 'expo-router';
import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ecb613',
        tabBarInactiveTintColor: '#8c8c8c',
        tabBarStyle: styles.tabBar,
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
              <View style={styles.sellButton}>
                <MaterialIcons name="add" size={22} color="#221d10" />
              </View>
              <Text style={styles.sellLabel}>Sell</Text>
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
    backgroundColor: '#221d10',
    borderTopColor: 'rgba(236, 182, 19, 0.15)',
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
    backgroundColor: '#ecb613',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    shadowColor: '#ecb613',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    width: 44,
  },
  sellLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
});
