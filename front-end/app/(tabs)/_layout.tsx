import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';
import { useAuth } from '@/hooks/auth-provider';
import { useAppTheme } from '@/hooks/use-app-theme';

type AnimatedTabBarButtonProps = BottomTabBarButtonProps & {
  activeLift?: number;
  activeScale?: number;
  showActiveGlow?: boolean;
};

function AnimatedTabBarButton({
  'aria-selected': isSelected,
  activeLift = -8,
  activeScale = 1.04,
  children,
  onPressIn,
  onPressOut,
  showActiveGlow = true,
  style,
  ...props
}: AnimatedTabBarButtonProps) {
  const { theme } = useAppTheme();
  const progress = React.useRef(new Animated.Value(isSelected === true ? 1 : 0)).current;
  const isFocused = isSelected === true;

  const animateProgress = React.useCallback(
    (toValue: number) => {
      Animated.spring(progress, {
        toValue,
        damping: 24,
        mass: 0.62,
        stiffness: 310,
        useNativeDriver: true,
      }).start();
    },
    [progress],
  );

  React.useEffect(() => {
    animateProgress(isFocused ? 1 : 0);
  }, [animateProgress, isFocused]);

  const handlePressIn: NonNullable<BottomTabBarButtonProps['onPressIn']> = (event) => {
    animateProgress(isFocused ? 1 : 0.68);
    onPressIn?.(event);
  };

  const handlePressOut: NonNullable<BottomTabBarButtonProps['onPressOut']> = (event) => {
    animateProgress(isFocused ? 1 : 0);
    onPressOut?.(event);
  };

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, activeLift],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, activeScale],
  });
  const indicatorOpacity = progress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 0.28, 1],
  });
  const indicatorScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.78, 1],
  });

  return (
    <PlatformPressable
      {...props}
      aria-selected={isSelected}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={style}>
      <Animated.View style={[styles.tabButtonInner, { transform: [{ translateY }, { scale }] }]}>
        {showActiveGlow ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.activeTabGlow,
              {
                backgroundColor: theme.surfaceMuted,
                borderColor: theme.border,
                opacity: indicatorOpacity,
                transform: [{ scale: indicatorScale }],
              },
            ]}
          />
        ) : null}
        {children}
      </Animated.View>
    </PlatformPressable>
  );
}

function SellTabBarButton(props: BottomTabBarButtonProps) {
  const { theme } = useAppTheme();
  const isSelected = props['aria-selected'] === true;
  const colorProgress = React.useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(colorProgress, {
      toValue: isSelected ? 1 : 0,
      duration: 170,
      useNativeDriver: false,
    }).start();
  }, [colorProgress, isSelected]);

  const activeIconOpacity = colorProgress;
  const inactiveIconOpacity = colorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const backgroundColor = colorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.surfaceMuted, theme.primary],
  });
  const borderColor = colorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.textMuted, theme.primary],
  });
  const labelColor = colorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.textMuted, theme.primary],
  });

  return (
    <AnimatedTabBarButton {...props} activeLift={-11} activeScale={1.04} showActiveGlow={false} style={[props.style, styles.sellButtonContainer]}>
      <Animated.View
        style={[
          styles.sellButton,
          {
            backgroundColor,
            borderColor,
            shadowColor: theme.primary,
          },
        ]}>
        <Animated.View style={[styles.sellIconLayer, { opacity: inactiveIconOpacity }]}>
          <MaterialIcons name="add" size={26} color={theme.textMuted} />
        </Animated.View>
        <Animated.View style={[styles.sellIconLayer, { opacity: activeIconOpacity }]}>
          <MaterialIcons name="add" size={26} color={theme.textOnPrimary} />
        </Animated.View>
      </Animated.View>
      <Animated.Text style={[styles.sellLabel, { color: labelColor }]}>Sell</Animated.Text>
    </AnimatedTabBarButton>
  );
}

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
        tabBarItemStyle: styles.tabBarItem,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: theme.text,
          },
        ],
        tabBarLabelStyle: styles.tabLabel,
        tabBarButton: (props) => <AnimatedTabBarButton {...props} />,
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
          tabBarButton: (props) => <SellTabBarButton {...props} />,
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
    borderRadius: 30,
    borderWidth: 1,
    bottom: 14,
    elevation: 14,
    height: 86,
    left: 16,
    paddingBottom: 12,
    paddingHorizontal: 10,
    paddingTop: 13,
    position: 'absolute',
    right: 16,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
  },
  tabBarItem: {
    borderRadius: 24,
    overflow: 'visible',
    paddingHorizontal: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  filledIcon: {
    opacity: 1,
  },
  tabButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    minWidth: 64,
  },
  activeTabGlow: {
    borderRadius: 22,
    borderWidth: 1,
    bottom: 0,
    left: -3,
    position: 'absolute',
    right: -3,
    top: 0,
  },
  sellButtonContainer: {
    alignItems: 'center',
    marginTop: -18,
  },
  sellButton: {
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: 3,
    height: 52,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    width: 52,
  },
  sellIconLayer: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sellLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
});
