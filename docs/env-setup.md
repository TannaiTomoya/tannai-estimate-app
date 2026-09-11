# Environment variables (fill locally; do not commit)

Create a file named `.env.local` in the project root with:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=（API設定の Publishable key）
ADMIN_PASSWORD=（管理者パスワード）
```

見積書印刷用の自社情報（リポジトリが公開のため、コードには書かず env に置く）:

```
COMPANY_NAME=（正式社名）
COMPANY_REPRESENTATIVE=（代表者名。載せないなら空）
COMPANY_POSTAL_CODE=（例: 000-0000）
COMPANY_ADDRESS=（住所）
COMPANY_TEL=（電話番号）
COMPANY_FAX=（FAX番号。無ければ空）
COMPANY_INVOICE_NUMBER=（適格請求書発行事業者番号 T+13桁。無ければ空）
COMPANY_VALID_DAYS=30
COMPANY_DEFAULT_NOTE=（毎回入れる備考。無ければ空）
COMPANY_DEFAULT_STAFF=（担当者の既定値。例: 丹内。フォームで毎回変更可）
```

- 実際の値はこのファイルに書かない（リポジトリが公開のため）。`.env.local` と Vercel にだけ設定する
- 空欄の項目は見積書に印字されない
- Vercel にも同じ値を Production 環境変数として登録する

- Use **Publishable key** (not Secret keys)
- ログイン画面は管理者パスワードのみ（メール入力なし）
- メールはアプリに出さない。Supabase 内部ユーザーは固定: `admin@tannai-estimate.local`
- Do not commit `.env.local` (covered by `.gitignore` as `.env*`)

Vercel にも Supabase 3つ＋ `COMPANY_*` を設定する（`ENABLE_AUTH_SKIP` は置かない）。

Optional (local development only, never on Vercel):

```
ENABLE_AUTH_SKIP=true
```
