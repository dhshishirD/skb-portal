import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  // Only known languages: the cookie must never choose which file is loaded.
  const requested = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = requested === 'bn' ? 'bn' : 'en';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
