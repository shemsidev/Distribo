import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, type TextInput } from 'react-native';
import { Link } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText, Button, Notice, Screen, TextField } from '@/components';
import { useSession } from '@/features/authentication/SessionProvider';
import { useAfterSignIn } from '@/features/authentication/useAfterSignIn';
import { errorMessage, useT } from '@/localization';
import { colors, radius, spacing } from '@/theme';
import { isValidEmail, normalizePhone } from '@/utils/validation';

type Method = 'phone' | 'email';

export default function LoginScreen() {
  const tr = useT();
  const { signIn } = useSession();
  const passwordRef = useRef<TextInput>(null);
  const redirect = useAfterSignIn();

  const [method, setMethod] = useState<Method>('phone');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchMethod = (next: Method) => {
    setMethod(next);
    setIdentifier('');
    setErrors({});
    setFormError(null);
  };

  const submit = async () => {
    const next: typeof errors = {};
    if (!identifier.trim()) next.identifier = tr.validation.required;
    else if (method === 'phone' && !normalizePhone(identifier)) next.identifier = tr.validation.phone;
    else if (method === 'email' && !isValidEmail(identifier)) next.identifier = tr.validation.email;
    if (!password) next.password = tr.validation.required;
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      await signIn(identifier.trim(), password);
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll edges={['bottom']} style={styles.container}>
        <View style={styles.logo}>
          <Ionicons name="cube" size={36} color={colors.textOnPrimary} />
        </View>
        <AppText variant="title" align="center">
          Distribo
        </AppText>
        <AppText color="textSecondary" align="center" style={styles.subtitle}>
          {redirect === 'checkout' ? tr.auth.loginToOrderMessage : tr.auth.loginSubtitle}
        </AppText>

        <View style={styles.segment} accessibilityRole="tablist">
          {(['phone', 'email'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => switchMethod(m)}
              accessibilityRole="tab"
              accessibilityState={{ selected: method === m }}
              style={[styles.segmentItem, method === m && styles.segmentActive]}
            >
              <Ionicons
                name={m === 'phone' ? 'call-outline' : 'mail-outline'}
                size={16}
                color={method === m ? colors.primary : colors.textSecondary}
              />
              <AppText variant="bodyStrong" color={method === m ? 'primary' : 'textSecondary'}>
                {m === 'phone' ? tr.auth.byPhone : tr.auth.byEmail}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={styles.form}>
          <TextField
            label={method === 'phone' ? tr.auth.phone : tr.auth.email}
            placeholder={method === 'phone' ? tr.auth.phonePlaceholder : tr.auth.emailPlaceholder}
            value={identifier}
            onChangeText={setIdentifier}
            error={errors.identifier}
            keyboardType={method === 'phone' ? 'phone-pad' : 'email-address'}
            autoComplete={method === 'phone' ? 'tel' : 'email'}
            textContentType={method === 'phone' ? 'telephoneNumber' : 'emailAddress'}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <TextField
            ref={passwordRef}
            label={tr.auth.password}
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureToggle
            autoComplete="current-password"
            textContentType="password"
            autoCapitalize="none"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          {formError ? <Notice kind="danger">{formError}</Notice> : null}
          <Button title={tr.auth.signIn} onPress={submit} loading={loading} fullWidth />
        </View>

        <View style={styles.footer}>
          <AppText color="textSecondary">{tr.auth.noAccount}</AppText>
          <Link href={{ pathname: '/register', params: redirect ? { redirect } : {} }} replace asChild>
            <Pressable hitSlop={8} accessibilityRole="link">
              <AppText variant="bodyStrong" color="primary">
                {tr.auth.register}
              </AppText>
            </Pressable>
          </Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { justifyContent: 'center', gap: spacing.sm, maxWidth: 440 },
  logo: {
    alignSelf: 'center',
    width: 68,
    height: 68,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: { marginBottom: spacing.lg },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radius.md,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 40,
    borderRadius: radius.sm,
  },
  segmentActive: { backgroundColor: colors.surface },
  form: { gap: spacing.lg, marginTop: spacing.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.xl },
});
