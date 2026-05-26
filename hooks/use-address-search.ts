import { useEffect, useState } from 'react';

import { api } from '@/lib/api';

export type AddressSuggestion = {
  label: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
};

export function useAddressSearch(query: string, token: string | null) {
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsAvailable(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await api.get('/addresses/search', {
          params: { text: 'a' },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!cancelled) {
          setIsAvailable(response.data?.available !== false);
        }
      } catch {
        if (!cancelled) {
          setIsAvailable(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!token || !isAvailable || trimmed.length < 3) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await api.get('/addresses/search', {
          params: { text: trimmed },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!cancelled) {
          setIsAvailable(response.data?.available !== false);
          setResults((response.data?.results ?? []) as AddressSuggestion[]);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [isAvailable, query, token]);

  return { results, isSearching, isAvailable };
}
