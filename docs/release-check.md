# Vercel共有前チェックリスト

父へURLを渡す前に、本人アカウントと父アカウントの両方で確認する。

1. [ ] 未ログインで `/estimates` にアクセスすると `/login` に飛ぶ
2. [ ] 未ログインで `/estimates/new` にアクセスすると `/login` に飛ぶ
3. [ ] 未ログインで `/estimates/[id]` にアクセスすると `/login` に飛ぶ
4. [ ] 本人アカウントでログインできる
5. [ ] 父アカウントでログインできる
6. [ ] ログイン後 `/estimates` が表示される
7. [ ] `/estimates` から `/estimates/new` に行ける
8. [ ] 見積もり1件を保存できる
9. [ ] 保存後 `/estimates/[id]` で内容を確認できる
10. [ ] 父アカウントでも同じ見積もりが見える
11. [ ] ログアウトできる
12. [ ] ログアウト後、見積もり画面に戻れない
13. [ ] Vercel に `ENABLE_AUTH_SKIP` が設定されていない
14. [ ] 公開サインアップ画面が存在しない

## 本番ルール

- 環境変数は `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` のみ
- `ENABLE_AUTH_SKIP` は本番に置かない
- テストログインボタンは置かない
- 公開サインアップは作らない
