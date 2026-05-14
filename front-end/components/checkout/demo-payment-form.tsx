import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

type DemoPaymentFormProps = {
  totalLabel: string;
  isSubmitting: boolean;
  onPay: () => Promise<void>;
  onValidationError: (message: string) => void;
  theme: {
    primary: string;
    text: string;
    textOnPrimary: string;
    textMuted: string;
    border: string;
    surface: string;
    background: string;
  };
};

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function DemoPaymentForm({
  totalLabel,
  isSubmitting,
  onPay,
  onValidationError,
  theme,
}: DemoPaymentFormProps) {
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const cardDigits = useMemo(() => cardNumber.replace(/\D/g, ''), [cardNumber]);
  const isBusy = isSubmitting || isProcessing;

  const handlePay = async () => {
    if (isBusy) {
      return;
    }

    if (!cardholderName.trim()) {
      onValidationError('Enter the name on the card.');
      return;
    }

    if (cardDigits.length < 16) {
      onValidationError('Enter a valid card number.');
      return;
    }

    if (!/^\d{2}\/\d{2}$/.test(expiry.trim())) {
      onValidationError('Enter expiry as MM/YY.');
      return;
    }

    if (!/^\d{3}$/.test(cvc.trim())) {
      onValidationError('Enter a 3-digit security code.');
      return;
    }

    try {
      setIsProcessing(true);
      await new Promise((resolve) => setTimeout(resolve, 900));
      await onPay();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View>
      <View className="flex-row items-center justify-between rounded-2xl border px-4 py-3" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
        <View className="flex-row items-center gap-2">
          <MaterialIcons name="lock" size={16} color={theme.primary} />
          <Text className="text-sm font-semibold" style={{ color: theme.text }}>
            Secure card payment
          </Text>
        </View>
        <Text className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
          Stripe
        </Text>
      </View>

      <Text className="mt-4 text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
        Name on card
      </Text>
      <TextInput
        value={cardholderName}
        onChangeText={setCardholderName}
        placeholder="Full name"
        placeholderTextColor={theme.textMuted}
        autoCapitalize="words"
        className="mt-2 rounded-2xl border px-3 py-3"
        style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.background }}
      />

      <Text className="mt-4 text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
        Card number
      </Text>
      <TextInput
        value={cardNumber}
        onChangeText={(value) => setCardNumber(formatCardNumber(value))}
        placeholder="4242 4242 4242 4242"
        placeholderTextColor={theme.textMuted}
        keyboardType="number-pad"
        className="mt-2 rounded-2xl border px-3 py-3"
        style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.background }}
      />

      <View className="mt-4 flex-row gap-3">
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
            Expiry
          </Text>
          <TextInput
            value={expiry}
            onChangeText={(value) => setExpiry(formatExpiry(value))}
            placeholder="MM/YY"
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
            className="mt-2 rounded-2xl border px-3 py-3"
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.background }}
          />
        </View>
        <View className="w-28">
          <Text className="text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
            CVC
          </Text>
          <TextInput
            value={cvc}
            onChangeText={(value) => setCvc(value.replace(/\D/g, '').slice(0, 3))}
            placeholder="123"
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
            secureTextEntry
            className="mt-2 rounded-2xl border px-3 py-3"
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.background }}
          />
        </View>
      </View>

      <View className="mt-4 flex-row gap-2">
        {['VISA', 'MC', 'AMEX'].map((label) => (
          <View
            key={label}
            className="rounded-full border px-3 py-1"
            style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <Text className="text-[10px] font-bold tracking-[0.8px]" style={{ color: theme.textMuted }}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <Text className="mt-3 text-xs leading-5" style={{ color: theme.textMuted }}>
        Demo checkout only. No card is charged and details are not sent to a payment provider.
      </Text>

      <Pressable
        className="mt-4 rounded-full items-center justify-center py-4"
        style={{ backgroundColor: theme.primary, opacity: isBusy ? 0.7 : 1 }}
        disabled={isBusy}
        onPress={handlePay}>
        {isBusy ? (
          <ActivityIndicator color={theme.textOnPrimary} />
        ) : (
          <Text className="text-sm font-bold uppercase tracking-[1px]" style={{ color: theme.textOnPrimary }}>
            Pay {totalLabel}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
