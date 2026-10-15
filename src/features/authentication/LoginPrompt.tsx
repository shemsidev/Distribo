import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useT } from '@/localization';
import { colors, spacing } from '@/theme';

interface LoginPromptProps {
  icon?: ComponentProps<typeof Ionicons>['name'];
  title: string;
  message: string;
  /** Rruga ku kthehet përdoruesi pas hyrjes. */
  redirect?: string;
}

/** Ftesë për hyrje/regjistrim për vizitorët (porositë dhe llogaria kërkojnë identifikim). */
export function LoginPrompt({ icon = 'person-circle-outline', title, message, redirect }: LoginPromptProps) {
  const tr = useT();
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={56} color={colors.primary} />
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      <AppText color="textSecondary" align="center">
        {message}
      </AppText>
      <View style={styles.actions}>
        <Button title={tr.auth.signIn} onPress={() => router.push({ pathname: '/login', params: redirect ? { redirect } : {} })} fullWidth />
        <Button
          title={tr.auth.register}
          variant="secondary"
          onPress={() => router.push({ pathname: '/register', params: redirect ? { redirect } : {} })}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  actions: { gap: spacing.md, marginTop: spacing.md, maxWidth: 400, width: '100%', alignSelf: 'center' },
});
