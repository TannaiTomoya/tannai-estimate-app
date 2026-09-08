# Vercel共有前チェックリスト

父へURLを渡す前に、本人アカウントと父アカウントの両方で確認する。

1. [ ] 未ログインで `/estimates` にアクセスすると `/login` に飛ぶ
2. [ ] 未ログインで `/estimates/new` にアクセスすると `/login` に飛ぶ
3. [ ] 未ログインで `/estimates/[id]` にアクセスすると `/login` に飛ぶ
4. [ ] 管理者パスワードでログインできる
5. [ ] （暫定）同じ管理者パスワードで父・本人とも入れる
6. [ ] ログイン後 `/estimates` が表示される
7. [ ] `/estimates` から `/estimates/new` に行ける
8. [ ] 見積もり1件を保存できる
9. [ ] 保存後 `/estimates/[id]` で内容を確認できる
10. [ ] ログアウトできる
11. [ ] ログアウト後、見積もり画面に戻れない
12. [ ] Vercel に `ENABLE_AUTH_SKIP` が設定されていない
13. [ ] 公開サインアップ画面が存在しない
14. [ ] Vercel に `ADMIN_EMAIL` が設定されている（パスワードは Users 側）

## 本番ルール

- 環境変数は `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` のみ
- `ENABLE_AUTH_SKIP` は本番に置かない
- テストログインボタンは置かない
- 公開サインアップは作らない
