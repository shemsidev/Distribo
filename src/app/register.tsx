import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Link, router } from 'expo-router';

import { AppText, Button, EmptyState, Notice, Screen, TextField } from '@/components';
import { useSession } from '@/features/authentication/SessionProvider';
import { useAfterSignIn } from '@/features/authentication/useAfterSignIn';
import { errorMessage, useT } from '@/localization';
import { fieldError, isApiError } from '@/services/api/errors';
import { colors, spacing } from '@/theme';
import { checkPassword, isValidEmail, normalizePhone } from '@/utils/validation';

type Field = 'fullName' | 'businessName' | 'email' | 'phone' | 'password' | 'confirm' | 'taxNumber' | 'city' | 'street';

const initial: Record<Field, string> = {
  fullName: '',
  businessName: '',
  email: '',
  phone: '',
  password: '',
  confirm: '',
  taxNumber: '',
  city: '',
  street: '',
};

/** Regjistrim me email + numër telefoni; të dyja mund të përdoren më pas për hyrje. */
export default function RegisterScreen() {
  const tr = useT();
  const { register } = useSession();
  const redirect = useAfterSignIn();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (field: Field) => (text: string) => setValues((v) => ({ ...v, [field]: text }));

  const validate = (): boolean => {
    const e: Partial<Record<Field, string>> = {};
    if (values.fullName.trim().length < 2) e.fullName = tr.validation.nameShort;
    if (values.businessName.trim().length < 2) e.businessName = tr.validation.nameShort;
    if (!isValidEmail(values.email)) e.email = tr.validation.email;
    if (!normalizePhone(values.phone)) e.phone = tr.validation.phone;
    const pw = checkPassword(values.password);
    if (pw === 'short') e.password = tr.validation.passwordShort;
    if (pw === 'weak') e.password = tr.validation.passwordWeak;
    if (values.confirm !== values.password) e.confirm = tr.validation.passwordMismatch;
    if (!values.city.trim()) e.city = tr.validation.required;
    if (!values.street.trim()) e.street = tr.validation.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    setFormError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await register({
        fullName: values.fullName.trim(),
        businessName: values.businessName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        password: values.password,
        taxNumber: values.taxNumber.trim() || undefined,
        city: values.city.trim(),
        street: values.street.trim(),
      });
      // Nëse kërkohet miratim, shfaq mesazhin; përndryshe sesioni hapet dhe navigimi kalon te kryefaqja.
      if (result.requiresApproval) setPendingMessage(result.message);
    } catch (e) {
      if (isApiError(e, 'email_taken')) setErrors({ email: errorMessage(e) });
      else if (isApiError(e, 'phone_taken')) setErrors({ phone: errorMessage(e) });
      else if (isApiError(e, 'validation_failed')) {
        const server: Partial<Record<Field, string>> = {};
        (Object.keys(initial) as Field[]).forEach((f) => {
          const msg = fieldError(e, f);
          if (msg) server[f] = msg;
        });
        setErrors(server);
      } else setFormError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (pendingMessage) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon="hourglass-outline"
          title={tr.auth.pendingTitle}
          message={pendingMessage}
          action={{ title: tr.auth.backToLogin, onPress: () => router.replace({ pathname: '/login', params: redirect ? { redirect } : {} }) }}
        />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll edges={['bottom']} style={styles.container}>
        <AppText variant="title">{tr.auth.registerTitle}</AppText>
        <AppText color="textSecondary">{tr.auth.registerSubtitle}</AppText>

        <View style={styles.form}>
          <TextField label={tr.auth.fullName} value={values.fullName} onChangeText={set('fullName')} error={errors.fullName} autoComplete="name" textContentType="name" />
          <TextField label={tr.auth.businessName} value={values.businessName} onChangeText={set('businessName')} error={errors.businessName} textContentType="organizationName" />
          <TextField
            label={tr.auth.phone}
            placeholder={tr.auth.phonePlaceholder}
            value={values.phone}
            onChangeText={set('phone')}
            error={errors.phone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
          />
          <TextField
            label={tr.auth.email}
            placeholder={tr.auth.emailPlaceholder}
            value={values.email}
            onChangeText={set('email')}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
          />
          <TextField label={tr.auth.taxNumber} value={values.taxNumber} onChangeText={set('taxNumber')} error={errors.taxNumber} autoCapitalize="characters" />
          <TextField label={tr.auth.city} value={values.city} onChangeText={set('city')} error={errors.city} textContentType="addressCity" />
          <TextField label={tr.auth.street} value={values.street} onChangeText={set('street')} error={errors.street} textContentType="fullStreetAddress" />
          <View style={styles.gapXs}>
            <TextField
              label={tr.auth.password}
              value={values.password}
              onChangeText={set('password')}
              error={errors.password}
              secureToggle
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
            />
            {!errors.password ? (
              <AppText variant="caption" color="textMuted">
                {tr.auth.passwordHint}
              </AppText>
            ) : null}
          </View>
          <TextField
            label={tr.auth.confirmPassword}
            value={values.confirm}
            onChangeText={set('confirm')}
            error={errors.confirm}
            secureToggle
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          {formError ? <Notice kind="danger">{formError}</Notice> : null}
          <Button title={tr.auth.createAccount} onPress={submit} loading={loading} fullWidth />
        </View>

        <View style={styles.footer}>
          <AppText color="textSecondary">{tr.auth.haveAccount}</AppText>
          <Link href={{ pathname: '/login', params: redirect ? { redirect } : {} }} replace asChild>
            <Pressable hitSlop={8} accessibilityRole="link">
              <AppText variant="bodyStrong" color="primary">
                {tr.auth.signIn}
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
  container: { gap: spacing.sm, maxWidth: 520 },
  form: { gap: spacing.lg, marginTop: spacing.lg },
  gapXs: { gap: spacing.xs },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginVertical: spacing.xl },
});
