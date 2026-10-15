import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { useSession } from './SessionProvider';

/**
 * Pas hyrjes/regjistrimit: kthehu te faqja e mëparshme, ose vazhdo direkt me porosinë
 * kur hyrja u kërkua nga shporta (?redirect=checkout).
 */
export function useAfterSignIn(): string | undefined {
  const { status } = useSession();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();

  useEffect(() => {
    if (status !== 'signedIn') return;
    if (redirect === 'checkout') router.replace('/checkout');
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [status, redirect]);

  return redirect;
}
