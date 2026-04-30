import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/auth-provider';
import { api } from '@/lib/api';

type CartContextValue = {
  cartCount: number;
  refreshCartCount: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [cartCount, setCartCount] = useState(0);

  const refreshCartCount = useCallback(async () => {
    if (!token) {
      setCartCount(0);
      return;
    }

    try {
      const response = await api.get('/cart/count', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCartCount(Number(response.data?.count ?? 0));
    } catch {
      setCartCount(0);
    }
  }, [token]);

  useEffect(() => {
    refreshCartCount();
  }, [refreshCartCount]);

  const value = useMemo(
    () => ({
      cartCount,
      refreshCartCount,
    }),
    [cartCount, refreshCartCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
