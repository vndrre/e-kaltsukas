import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/hooks/auth-provider';
import { useWalletSummary } from '@/hooks/use-wallet-summary';
import { useAppTheme } from '@/hooks/use-app-theme';
import { api } from '@/lib/api';
import { releaseFocusBeforeNavigation } from '@/lib/navigation-focus';

type WalletTransaction = {
  id: string;
  type: 'order_release' | 'withdrawal';
  amount: number;
  direction: 'credit' | 'debit';
  status: string;
  description?: string | null;
  createdAt: string;
};

const MIN_WITHDRAWAL = 1;

function formatMoney(value: number) {
  return `€${value.toFixed(2)}`;
}

function formatTransactionLabel(transaction: WalletTransaction) {
  if (transaction.type === 'withdrawal') {
    return 'Withdrawal';
  }

  return transaction.description || 'Sale completed';
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WalletScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { token, user } = useAuth();
  const { wallet, isLoading, loadWallet } = useWalletSummary();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawModalVisible, setIsWithdrawModalVisible] = useState(false);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

  const payoutDestination = useMemo(() => {
    const email = user?.email?.trim();
    if (!email) {
      return 'Linked bank account ···· 4821';
    }

    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) {
      return 'Linked bank account ···· 4821';
    }

    const maskedLocal = localPart.length <= 2 ? `${localPart[0] ?? '*'}*` : `${localPart.slice(0, 2)}···`;
    return `${maskedLocal}@${domain}`;
  }, [user?.email]);

  const loadActivity = useCallback(async () => {
    if (!token) {
      setTransactions([]);
      setIsLoadingActivity(false);
      return;
    }

    try {
      setIsLoadingActivity(true);
      const response = await api.get('/wallet/transactions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { limit: 25 },
      });
      setTransactions((response.data?.transactions ?? []) as WalletTransaction[]);
    } catch {
      setTransactions([]);
    } finally {
      setIsLoadingActivity(false);
    }
  }, [token]);

  const refreshWallet = useCallback(async () => {
    await Promise.all([loadWallet(), loadActivity()]);
  }, [loadActivity, loadWallet]);

  useFocusEffect(
    useCallback(() => {
      void refreshWallet();
    }, [refreshWallet])
  );

  const parsedWithdrawAmount = Number(withdrawAmount.replace(',', '.'));
  const availableBalance = wallet?.available ?? 0;
  const pendingBalance = wallet?.pending ?? 0;
  const canWithdraw =
    Number.isFinite(parsedWithdrawAmount) &&
    parsedWithdrawAmount >= MIN_WITHDRAWAL &&
    parsedWithdrawAmount <= availableBalance;

  const openWithdrawModal = () => {
    if (availableBalance < MIN_WITHDRAWAL) {
      Alert.alert('Nothing to withdraw', 'Your available balance is below the minimum withdrawal amount.');
      return;
    }

    setWithdrawAmount(availableBalance.toFixed(2));
    setIsWithdrawModalVisible(true);
  };

  const closeWithdrawModal = () => {
    if (isSubmittingWithdrawal) {
      return;
    }

    setIsWithdrawModalVisible(false);
  };

  const submitWithdrawal = async () => {
    if (!token || isSubmittingWithdrawal || !canWithdraw) {
      return;
    }

    try {
      setIsSubmittingWithdrawal(true);
      const response = await api.post(
        '/wallet/withdrawals',
        { amount: parsedWithdrawAmount },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setIsWithdrawModalVisible(false);
      setWithdrawAmount('');
      await refreshWallet();
      Alert.alert('Withdrawal sent', response.data?.message || 'Your withdrawal has been processed.');
    } catch (error: any) {
      Alert.alert('Withdrawal failed', error?.response?.data?.message || 'Could not process your withdrawal.');
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const goBack = () => {
    releaseFocusBeforeNavigation();
    requestAnimationFrame(() => {
      router.back();
    });
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <View
        className="px-4 pb-4 pt-12"
        style={{ backgroundColor: theme.background, borderBottomColor: theme.border, borderBottomWidth: 1 }}>
        <View className="flex-row items-center justify-between">
          <Pressable className="h-9 w-9 items-center justify-center rounded-full" onPress={goBack} style={{ backgroundColor: theme.surfaceMuted }}>
            <MaterialIcons name="arrow-back" size={20} color={theme.text} />
          </Pressable>
          <Text className="text-2xl font-bold italic" style={{ color: theme.primary }}>
            Wallet
          </Text>
          <View className="h-9 w-9" />
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="rounded-2xl border px-4 py-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
          <Text className="text-sm" style={{ color: theme.textMuted }}>
            Available
          </Text>
          {isLoading ? (
            <View className="mt-4 items-start">
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : (
            <Text className="mt-1 text-4xl font-semibold" style={{ color: theme.text }}>
              {formatMoney(availableBalance)}
            </Text>
          )}

          <View className="mt-5 flex-row justify-between gap-4">
            <View className="flex-1">
              <Text className="text-xs" style={{ color: theme.textMuted }}>
                Pending
              </Text>
              <Text className="mt-1 text-base font-medium" style={{ color: theme.text }}>
                {formatMoney(pendingBalance)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs" style={{ color: theme.textMuted }}>
                Payout
              </Text>
              <Text className="mt-1 text-base font-medium" numberOfLines={1} style={{ color: theme.text }}>
                {payoutDestination}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          className="mt-4 items-center rounded-full py-3.5"
          style={{ backgroundColor: theme.primary, opacity: availableBalance >= MIN_WITHDRAWAL ? 1 : 0.55 }}
          disabled={availableBalance < MIN_WITHDRAWAL}
          onPress={openWithdrawModal}>
          <Text className="text-sm font-semibold" style={{ color: theme.textOnPrimary }}>
            Withdraw
          </Text>
        </Pressable>

        <View className="mt-8">
          <Text className="mb-3 text-sm font-medium" style={{ color: theme.text }}>
            Activity
          </Text>
          {isLoadingActivity ? (
            <View className="items-start py-2">
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : transactions.length ? (
            <View className="gap-2">
              {transactions.map((transaction) => {
                const isCredit = transaction.direction === 'credit';
                return (
                  <View
                    key={transaction.id}
                    className="flex-row items-center justify-between rounded-xl px-3 py-3"
                    style={{ backgroundColor: theme.surface }}>
                    <View className="flex-1 pr-3">
                      <Text className="text-sm font-medium" style={{ color: theme.text }}>
                        {formatTransactionLabel(transaction)}
                      </Text>
                      <Text className="mt-0.5 text-xs" style={{ color: theme.textMuted }}>
                        {formatWhen(transaction.createdAt)}
                      </Text>
                    </View>
                    <Text className="text-sm font-semibold" style={{ color: isCredit ? theme.primary : theme.text }}>
                      {isCredit ? '+' : '-'}
                      {formatMoney(transaction.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text className="text-sm" style={{ color: theme.textMuted }}>
              No activity yet.
            </Text>
          )}
        </View>
      </ScrollView>

      <Modal visible={isWithdrawModalVisible} transparent animationType="fade" onRequestClose={closeWithdrawModal}>
        <View className="flex-1 items-center justify-center px-5">
          <Pressable className="absolute inset-0 bg-black/55" onPress={closeWithdrawModal} />
          <View className="w-full max-w-[420px] rounded-2xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold" style={{ color: theme.text }}>
                Withdraw
              </Text>
              <Pressable
                className="h-8 w-8 items-center justify-center rounded-full"
                onPress={closeWithdrawModal}
                disabled={isSubmittingWithdrawal}
                style={{ backgroundColor: theme.surfaceMuted }}>
                <MaterialIcons name="close" size={18} color={theme.text} />
              </Pressable>
            </View>

            <Text className="mt-3 text-sm" style={{ color: theme.textMuted }}>
              To {payoutDestination}
            </Text>

            <TextInput
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.textMuted}
              className="mt-4 rounded-xl border px-3 py-3 text-lg font-semibold"
              style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.background }}
            />

            <View className="mt-3 flex-row gap-2">
              {[10, 25].map((value) => (
                <Pressable
                  key={value}
                  className="rounded-full px-3 py-2"
                  style={{ backgroundColor: theme.surfaceMuted }}
                  onPress={() => {
                    setWithdrawAmount(Math.min(value, availableBalance).toFixed(2));
                  }}>
                  <Text className="text-xs font-semibold" style={{ color: theme.text }}>
                    €{value}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: theme.surfaceMuted }}
                onPress={() => {
                  setWithdrawAmount(availableBalance.toFixed(2));
                }}>
                <Text className="text-xs font-semibold" style={{ color: theme.text }}>
                  All
                </Text>
              </Pressable>
            </View>

            <Pressable
              className="mt-5 items-center rounded-full py-3.5"
              style={{ backgroundColor: theme.primary, opacity: canWithdraw && !isSubmittingWithdrawal ? 1 : 0.45 }}
              disabled={!canWithdraw || isSubmittingWithdrawal}
              onPress={submitWithdrawal}>
              {isSubmittingWithdrawal ? (
                <ActivityIndicator color={theme.textOnPrimary} />
              ) : (
                <Text className="text-sm font-semibold" style={{ color: theme.textOnPrimary }}>
                  Confirm
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
