import { createClient } from '@supabase/supabase-js';

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      // Next.js patches global fetch to cache/dedupe by URL. Supabase's
      // .range() pagination sends the *same* URL with only a different
      // Range header, so without this, paginated requests beyond the
      // first page can silently be served the first page's cached
      // response. getAppData's unstable_cache wrapper is the only
      // caching layer we want here.
      global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
    }
  );
}
