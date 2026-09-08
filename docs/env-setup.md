# Environment variables (fill locally; do not commit)

Create a file named `.env.local` in the project root with:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=（API設定の Publishable key）
ADMIN_PASSWORD=（管理者パスワード）
```

- Use **Publishable key** (not Secret keys)
- ログイン画面は管理者パスワードのみ（メール入力なし）
- メールはアプリに出さない。Supabase 内部ユーザーは固定: `admin@tannai-estimate.local`
- Do not commit `.env.local` (covered by `.gitignore` as `.env*`)

Vercel にも同じ3つを設定する（`ENABLE_AUTH_SKIP` は置かない）。

Optional (local development only, never on Vercel):

```
ENABLE_AUTH_SKIP=true
```
