import type { ComponentProps, ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText, Button, Card, Chip, Divider, KeyValue, Notice, Screen, useToast } from '@/components';
import { LoginPrompt } from '@/features/authentication/LoginPrompt';
import { useSession } from '@/features/authentication/SessionProvider';
import { errorMessage, languages, useLocalization } from '@/localization';
import { meApi } from '@/services/api/endpoints';
import { getPushStatus, subscribePushStatus } from '@/services/notifications/push';
import { queryKeys } from '@/services/query';
import { colors, spacing } from '@/theme';
import type { Me } from '@/types/api';
import { confirm } from '@/utils/confirm';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export default function ProfileScreen() {
  const { tr, language, setLanguage } = useLocalization();
  const { user } = useSession();
  if (!user) {
    return (
      <Screen scroll style={styles.content}>
        <View style={styles.guest}>
          <LoginPrompt title={tr.auth.guestAccountTitle} message={tr.auth.guestAccountMessage} />
        </View>
        <Section title={tr.profile.language}>
          <View style={styles.chips}>
            {languages.map((l) => (
              <Chip key={l.code} label={l.label} selected={language === l.code} onPress={() => setLanguage(l.code)} />
            ))}
          </View>
        </Section>
      </Screen>
    );
  }
  return <AccountScreen />;
}

function AccountScreen() {
  const { tr, language, setLanguage } = useLocalization();
  const toast = useToast();
  const { user, signOut, setUser } = useSession();
  const pushStatus = useSyncExternalStore(subscribePushStatus, getPushStatus, getPushStatus);
  const addresses = useQuery({ queryKey: queryKeys.addresses, queryFn: () => meApi.addresses() });

  const preferences = useMutation({
    mutationFn: meApi.updatePreferences,
    onSuccess: (me: Me) => setUser(me),
    onError: (e) => toast.show(errorMessage(e), 'error'),
  });

  if (!user) return null;
  const prefs = user.notificationPreferences;

  const handleSignOut = async () => {
    const ok = await confirm({
      title: tr.auth.signOutConfirmTitle,
      message: tr.auth.signOutConfirmMessage,
      confirmText: tr.auth.signOut,
      destructive: true,
    });
    if (ok) await signOut();
  };

  const changeLanguage = (code: 'sq' | 'en') => {
    setLanguage(code);
    preferences.mutate({ language: code });
  };

  return (
    <Screen scroll style={styles.content}>
      <Card>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <AppText variant="heading" color="textOnPrimary">
              {user.fullName.slice(0, 1).toUpperCase()}
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="heading">{user.fullName}</AppText>
            <AppText color="textSecondary">{user.customer.businessName}</AppText>
          </View>
        </View>
        <Divider />
        <KeyValue label={tr.auth.phone} value={user.phone} />
        <KeyValue label={tr.auth.email} value={user.email} />
        {user.customer.taxNumber ? <KeyValue label={tr.profile.taxNumber} value={user.customer.taxNumber} /> : null}
        {user.customer.externalCode ? <KeyValue label={tr.profile.customerCode} value={user.customer.externalCode} /> : null}
        <AppText variant="caption" color="textMuted">
          {tr.profile.commercialNote}
        </AppText>
      </Card>

      <Section title={tr.profile.addresses}>
        <Card>
          {addresses.data?.length ? (
            addresses.data.map((a, i) => (
              <View key={a.id} style={styles.gapXs}>
                {i > 0 ? <Divider /> : null}
                <View style={styles.row}>
                  <Ionicons name="storefront-outline" size={20} color={colors.primary} />
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong">{a.name}</AppText>
                    <AppText color="textSecondary">
                      {a.street}, {a.city}
                    </AppText>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <AppText color="textSecondary">{addresses.isPending ? tr.common.loading : tr.profile.noAddresses}</AppText>
          )}
        </Card>
      </Section>

      <Section title={tr.profile.notifications}>
        <Card>
          <ToggleRow
            label={tr.profile.notifyOrders}
            value={prefs.orderUpdates}
            onChange={(v) => preferences.mutate({ orderUpdates: v })}
          />
          <Divider />
          <ToggleRow label={tr.profile.notifyOffers} value={prefs.offers} onChange={(v) => preferences.mutate({ offers: v })} />
          {pushStatus === 'unsupported' || pushStatus === 'failed' ? <Notice kind="info">{tr.profile.pushUnavailable}</Notice> : null}
          {pushStatus === 'denied' ? <Notice kind="warning">{tr.profile.pushDenied}</Notice> : null}
        </Card>
        <LinkRow icon="notifications-outline" label={tr.profile.notificationHistory} onPress={() => router.push('/profile/notifications')} />
      </Section>

      <Section title={tr.profile.language}>
        <View style={styles.chips}>
          {languages.map((l) => (
            <Chip key={l.code} label={l.label} selected={language === l.code} onPress={() => changeLanguage(l.code)} />
          ))}
        </View>
      </Section>

      <Section title={tr.profile.security}>
        <LinkRow icon="key-outline" label={tr.profile.changePassword} onPress={() => router.push('/profile/change-password')} />
      </Section>

      <Button title={tr.auth.signOut} variant="danger" onPress={handleSignOut} fullWidth />
      <AppText variant="caption" color="textMuted" align="center">
        Distribo · {tr.profile.version} {Constants.expoConfig?.version ?? '1.0.0'}
      </AppText>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="heading">{title}</AppText>
      {children}
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <AppText style={styles.flex}>{label}</AppText>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor={colors.surface}
        accessibilityLabel={label}
      />
    </View>
  );
}

function LinkRow({ icon, label, onPress }: { icon: IoniconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={styles.row}>
        <Ionicons name={icon} size={20} color={colors.primary} />
        <AppText style={styles.flex}>{label}</AppText>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  flex: { flex: 1 },
  gapXs: { gap: spacing.xs },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chips: { flexDirection: 'row', gap: spacing.sm },
  guest: { minHeight: 380 },
});
