import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { AppText, Button, Notice, Screen, TextField, useToast } from '@/components';
import { errorMessage, useT } from '@/localization';
import { authApi } from '@/services/api/endpoints';
import { isApiError } from '@/services/api/errors';
import { spacing } from '@/theme';
import { checkPassword } from '@/utils/validation';

export default function ChangePasswordScreen() {
  const tr = useT();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const e: typeof errors = {};
    if (!current) e.current = tr.validation.required;
    const pw = checkPassword(next);
    if (pw === 'short') e.next = tr.validation.passwordShort;
    if (pw === 'weak') e.next = tr.validation.passwordWeak;
    if (confirmValue !== next) e.confirm = tr.validation.passwordMismatch;
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length > 0) return;

    setLoading(true);
    try {
      await authApi.changePassword(current, next);
      toast.show(tr.profile.passwordChanged);
      router.back();
    } catch (err) {
      if (isApiError(err, 'wrong_password')) setErrors({ current: errorMessage(err) });
      else setFormError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll style={styles.content}>
      <TextField label={tr.profile.currentPassword} value={current} onChangeText={setCurrent} error={errors.current} secureToggle autoCapitalize="none" autoComplete="current-password" textContentType="password" />
      <TextField label={tr.profile.newPassword} value={next} onChangeText={setNext} error={errors.next} secureToggle autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
      <AppText variant="caption" color="textMuted">
        {tr.auth.passwordHint}
      </AppText>
      <TextField label={tr.auth.confirmPassword} value={confirmValue} onChangeText={setConfirmValue} error={errors.confirm} secureToggle autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" onSubmitEditing={submit} />
      {formError ? <Notice kind="danger">{formError}</Notice> : null}
      <Button title={tr.common.save} onPress={submit} loading={loading} fullWidth />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, maxWidth: 520 },
});
