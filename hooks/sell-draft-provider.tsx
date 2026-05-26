import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/auth-provider';

export type SellDraftImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

export type SellDraftForm = {
  title: string;
  story: string;
  condition: string;
  category: string;
  size: string;
  brand: string;
  price: string;
  audience: string;
};

export type ListingDraftPayload = SellDraftForm & {
  imageUrls: string[];
};

const MAX_IMAGES = 4;

const emptyForm = (): SellDraftForm => ({
  title: '',
  story: '',
  condition: '',
  category: '',
  size: '',
  brand: '',
  price: '',
  audience: '',
});

function hasMeaningfulForm(form: SellDraftForm) {
  return Boolean(
    form.title.trim() ||
      form.story.trim() ||
      form.condition ||
      form.category ||
      form.size ||
      form.brand ||
      form.price.trim() ||
      form.audience,
  );
}

function isPayloadMeaningful(payload: Partial<ListingDraftPayload> | null | undefined) {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const urls = payload.imageUrls;
  if (Array.isArray(urls) && urls.length > 0) {
    return true;
  }
  return hasMeaningfulForm({
    title: payload.title ?? '',
    story: payload.story ?? '',
    condition: payload.condition ?? '',
    category: payload.category ?? '',
    size: payload.size ?? '',
    brand: payload.brand ?? '',
    price: payload.price ?? '',
    audience: payload.audience ?? '',
  });
}

function hasMeaningfulLocal(images: SellDraftImage[], form: SellDraftForm) {
  return images.length > 0 || hasMeaningfulForm(form);
}

async function uploadListingImage(slot: SellDraftImage, token: string, index: number): Promise<string | undefined> {
  const formData = new FormData();
  const fallbackName = slot.fileName ?? `listing-${Date.now()}-${index}.jpg`;
  const mimeType = slot.mimeType ?? 'image/jpeg';

  if (Platform.OS === 'web') {
    const blob = await (await fetch(slot.uri)).blob();
    formData.append('image', blob, fallbackName);
  } else {
    formData.append('image', {
      uri: slot.uri,
      name: fallbackName,
      type: mimeType,
    } as unknown as Blob);
  }

  const response = await api.post('/items/upload-image', formData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data?.image?.url as string | undefined;
}

type SellDraftContextValue = {
  images: SellDraftImage[];
  form: SellDraftForm;
  draftHydratedFromServer: boolean;
  remainingSlots: number;
  addFromAssets: (assets: SellDraftImage[]) => void;
  removeAt: (index: number) => void;
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;
  patchForm: (partial: Partial<SellDraftForm>) => void;
  clear: () => void;
  hasMeaningfulLocalDraft: () => boolean;
  persistDraftToServer: () => Promise<{ ok: true } | { ok: false; message: string }>;
  deleteServerDraft: () => Promise<void>;
  persistDraftSilentlyOnBlur: () => Promise<void>;
  hydrateFromServerPayload: (payload: ListingDraftPayload) => void;
};

const SellDraftContext = createContext<SellDraftContextValue | null>(null);

export function SellDraftProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [images, setImages] = useState<SellDraftImage[]>([]);
  const [form, setForm] = useState<SellDraftForm>(emptyForm);
  const [draftHydratedFromServer, setDraftHydratedFromServer] = useState(false);
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  const patchForm = useCallback((partial: Partial<SellDraftForm>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  const addFromAssets = useCallback((assets: SellDraftImage[]) => {
    setImages((prev) => {
      const next = [...prev];
      for (const asset of assets) {
        if (next.length >= MAX_IMAGES) {
          break;
        }
        if (asset.uri) {
          next.push(asset);
        }
      }
      return next;
    });
  }, []);

  const removeAt = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveUp = useCallback((index: number) => {
    if (index <= 0) {
      return;
    }
    setImages((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setImages((prev) => {
      if (index >= prev.length - 1) {
        return prev;
      }
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setImages([]);
    setForm(emptyForm());
    setDraftHydratedFromServer(false);
  }, []);

  const hasMeaningfulLocalDraft = useCallback(() => hasMeaningfulLocal(images, form), [images, form]);

  const hydrateFromServerPayload = useCallback((payload: ListingDraftPayload) => {
    const urls = Array.isArray(payload.imageUrls) ? payload.imageUrls.filter(Boolean).slice(0, MAX_IMAGES) : [];
    setImages(urls.map((uri) => ({ uri })));
    setForm({
      title: payload.title ?? '',
      story: payload.story ?? '',
      condition: payload.condition ?? '',
      category: payload.category ?? '',
      size: payload.size ?? '',
      brand: payload.brand ?? '',
      price: payload.price ?? '',
      audience: payload.audience ?? '',
    });
    setDraftHydratedFromServer(true);
  }, []);

  const deleteServerDraft = useCallback(async () => {
    const t = tokenRef.current;
    if (!t) {
      return;
    }
    try {
      await api.delete('/items/draft', {
        headers: { Authorization: `Bearer ${t}` },
      });
    } catch {
      /* ignore */
    }
  }, []);

  const persistDraftToServer = useCallback(async (): Promise<{ ok: true } | { ok: false; message: string }> => {
    const t = tokenRef.current;
    if (!t) {
      return { ok: false, message: 'You must be signed in to save a draft.' };
    }
    if (!hasMeaningfulLocal(images, form)) {
      return { ok: false, message: 'Nothing to save yet.' };
    }

    try {
      const imageUrls: string[] = [];
      for (let i = 0; i < images.length; i += 1) {
        const slot = images[i];
        if (slot.uri.startsWith('http://') || slot.uri.startsWith('https://')) {
          imageUrls.push(slot.uri);
        } else {
          const url = await uploadListingImage(slot, t, i);
          if (url) {
            imageUrls.push(url);
          }
        }
      }

      const payload: ListingDraftPayload = {
        ...form,
        imageUrls,
      };

      await api.put(
        '/items/draft',
        { payload },
        {
          headers: { Authorization: `Bearer ${t}` },
        },
      );
      return { ok: true };
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const message = err?.response?.data?.message || err?.message || 'Could not save draft.';
      return { ok: false, message };
    }
  }, [form, images]);

  const persistDraftSilentlyOnBlur = useCallback(async () => {
    const t = tokenRef.current;
    if (!t) {
      return;
    }
    if (!hasMeaningfulLocal(images, form)) {
      await deleteServerDraft();
      return;
    }
    const result = await persistDraftToServer();
    if (!result.ok) {
      console.warn('Sell draft autosave failed:', result.message);
    }
  }, [deleteServerDraft, form, images, persistDraftToServer]);

  const value = useMemo(
    () => ({
      images,
      form,
      draftHydratedFromServer,
      remainingSlots: MAX_IMAGES - images.length,
      addFromAssets,
      removeAt,
      moveUp,
      moveDown,
      patchForm,
      clear,
      hasMeaningfulLocalDraft,
      persistDraftToServer,
      deleteServerDraft,
      persistDraftSilentlyOnBlur,
      hydrateFromServerPayload,
    }),
    [
      images,
      form,
      draftHydratedFromServer,
      addFromAssets,
      removeAt,
      moveUp,
      moveDown,
      patchForm,
      clear,
      hasMeaningfulLocalDraft,
      persistDraftToServer,
      deleteServerDraft,
      persistDraftSilentlyOnBlur,
      hydrateFromServerPayload,
    ],
  );

  return <SellDraftContext.Provider value={value}>{children}</SellDraftContext.Provider>;
}

export function useSellDraft() {
  const ctx = useContext(SellDraftContext);
  if (!ctx) {
    throw new Error('useSellDraft must be used within SellDraftProvider');
  }
  return ctx;
}

export function isListingDraftPayloadMeaningful(payload: unknown): payload is ListingDraftPayload {
  return isPayloadMeaningful(payload as Partial<ListingDraftPayload>);
}
