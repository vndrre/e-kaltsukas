import { useCallback, useState } from 'react';

import { useAuth } from '@/hooks/auth-provider';
import { api } from '@/lib/api';

export type WalletSummary = {
  availableCents: number;
  pendingCents: number;
  available: number;
  pending: number;
  currency: string;
  updatedAt?: string | null;
};

export function useWalletSummary() {
  const { token } = useAuth();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadWallet = useCallback(async () => {
    if (!token) {
      setWallet(null);
      setIsLoading(false);
      return null;
    }

    try {
      setIsLoading(true);
      const response = await api.get('/wallet', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const nextWallet = (response.data?.wallet ?? null) as WalletSummary | null;
      setWallet(nextWallet);
      return nextWallet;
    } catch {
      setWallet(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  return { wallet, isLoading, loadWallet };
}
