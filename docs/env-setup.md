# Environment variables (fill locally; do not commit)

Create a file named `.env.local` in the project root with:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=（API設定の Publishable key）
```

- Use **Publishable key** (not Secret keys)
- Do not commit `.env.local` (covered by `.gitignore` as `.env*`)

Optional (local development only, never on Vercel):

```
ENABLE_AUTH_SKIP=true
```
