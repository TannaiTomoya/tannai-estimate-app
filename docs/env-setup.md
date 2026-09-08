# Environment variables (fill locally; do not commit)

Create a file named `.env.local` in the project root with:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=（API設定の Publishable key）
ADMIN_EMAIL=（Supabase Users に作った共有アカウントのメール）
```

- Use **Publishable key** (not Secret keys)
- `ADMIN_EMAIL` は画面に出さない。管理者パスワードログイン用の固定メール
- パスワードは Supabase Users に設定したもの（env には書かない。画面で入力）
- Do not commit `.env.local` (covered by `.gitignore` as `.env*`)

Vercel にも同じ3つを設定する（`ENABLE_AUTH_SKIP` は置かない）。

Optional (local development only, never on Vercel):

```
ENABLE_AUTH_SKIP=true
```
