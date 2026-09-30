# Codex Usage for Stream Deck Neo

Stream Deck NeoのInfobarに、Codexの5時間枠・週間枠の**残量%**とリセット時刻を表示するWindows向けプラグインです。

```text
5h    90%       7d    64%
█████████░      ██████░░░░
     01:42           10/04
```

5hは緑、7dは青。バーの長さが残量に比例します。時刻は日本時間（Asia/Tokyo）です。

## 必要環境

- Windows 10以降
- Elgato Stream Deck Neo
- Stream Deck 7.6以降
- ChatGPTアカウントでログイン済みのCodex CLI（またはCodexデスクトップアプリ同梱CLI）

インストール先でNode.jsやnpmを別途入れる必要はありません。プラグインはStream Deck同梱Node.js 24で動作します。

## インストール

1. GitHub Releasesに配布ファイルがある場合は、`com.ayato.codexusage.streamDeckPlugin` をダウンロードします。ソースからの生成方法は下記を参照してください。
2. ファイルをダブルクリックしてStream Deckへインストールします。
3. Neoを選び、アクション一覧の「Codex Usage」をInfobarへ配置します。

更新も同じインストーラーを実行してください。

## 表示と更新

| 項目 | 表示 |
| --- | --- |
| 5h | 5時間枠の残量%、リセット時刻 |
| 7d | 週間枠の残量%、リセット月日（当日なら時刻） |
| バー | 残量に比例する長さ。5hは緑、7dは青 |
| `--` | 対応する値が取得できない |
| `LOADING` | 初回取得中 |
| `LOGIN` | ChatGPT認証が必要 |
| `ERROR` | CLI起動・通信・取得に失敗 |

表示開始時に即取得し、成功後60秒待って再取得します。通信時間は待機時間に加わります。
失敗後は2分、4分、8分、最大10分の間隔で再試行します。
非表示時は更新を停止し、失敗時には古い数値を現在値として表示しません。

## 認証の仕組み

そのPCの実行ユーザーがログインしているCodex CLIを利用します。
別のユーザーのPCでは、そのユーザーのアカウントの残量を取得します。
配布物に開発者のログイン情報は含まれません。

`codex app-server --listen stdio://` を子プロセスとして起動し、
`initialize` → `initialized` → `account/read`（`refreshToken: false`）→ `account/rateLimits/read` を送ります。
認証ファイルやトークンをプラグイン自身で直接読み取り・保存せず、
生のRPC応答・メール・トークン・サーバーstderrをプラグインログへ出力しません。
推論、スレッド作成、ログイン／ログアウト、強制トークン更新は行いません。
Codex本体と設定ファイルも編集しません。App Server自身の通常のログ・認証管理はCodex側の動作に従います。

WindowsではPATH上の `codex.exe` を優先し、見つからない場合は
`%LOCALAPPDATA%\OpenAI\Codex\bin` の同梱CLIを更新日時順に検索します。
任意の実行ファイルは `CODEX_BIN` に絶対パスで指定できます。
Stream Deckで利用する場合、この環境変数をStream Deckプロセスが引き継ぐ必要があります。

## 開発・ビルド

Node.js 24以降が必要です。

```powershell
npm.cmd ci
npm.cmd run release
```

型チェック・テスト・ビルド・公式検証・パッケージ生成を順に実行します。
生成物は `dist/com.ayato.codexusage.streamDeckPlugin` です。

個別コマンド:

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run build
npm.cmd run validate
npm.cmd run pack
```

ログイン済み環境での取得と模擬接続:

```powershell
npm.cmd run usage-test
npm.cmd run smoke
```

`smoke` はビルド後に実行し、ローカルWebSocket模擬ホストで実Usage値の送信を確認します。
この2つは認証とネットワークが必要なのでGitHub Actionsでは実行しません。
単体テストは認証情報なしで実行できます。

## ファイル構成

```text
src/                             プラグイン・Usage取得・表示処理
test/                           認証不要の単体テスト
scripts/                         ビルド・模擬接続検証
com.ayato.codexusage.sdPlugin/     manifest・レイアウト・アイコン
.github/workflows/check.yml       自動検証・インストーラー生成
dist/                           ローカル生成物（Git対象外）
```

`node_modules/`、調査用 `.research/`、ログ、生成済み `bin/`、`dist/` はGit対象外です。
アイコンはソース資産として管理し、ビルドで上書きしません。

## GitHubでの配布

ソースと `package-lock.json` をリポジトリへ登録してください。
GitHub ActionsはWindows / Node.js 24で検証とパッケージ生成を行い、インストーラーをArtifactとして保存します。
一般ユーザー向けには、そのファイルをGitHub Releaseの添付ファイルとして配布できます。
ワークフローから自動でRelease公開は行いません。

## トラブルシューティング

- `LOGIN`: 同じWindowsユーザーのターミナルで `codex login status` を確認し、必要ならCLIでログインしてください。
- `ERROR`: CLIが見つかるか確認してください。`codex.cmd` / `codex.ps1` ラッパーだけがある環境は自動検出の対象外です。必要なら実体の `codex.exe` を `CODEX_BIN` に指定してください。
- インストールできない: Stream Deck 7.6以降か確認してください。
- サンドボックス内だけで未ログインになる: 通常のWindowsターミナルで再確認してください。

## 検証状況・制約

Windows / Stream Deck 7.6 / Codex CLI 0.159.0で取得を検証し、Neo実機で数値・時刻・残量連動バーを確認済みです。
型チェック、単体テスト6件、公式レイアウト検証、模擬接続検証も実施しています。
長時間運転、自動認証更新、PC再起動後の復帰は継続検証項目です。

Codex App ServerはCLI側でexperimentalとされており、Codex更新による変更に追従が必要になる可能性があります。
取得処理は `src/usage/` に分離しています。対象は `codex` バケットの300分／10080分枠です。
使用率を `100 - usedPercent` で残量へ変換し、欠損を0%と扱いません。
コンテキスト使用量やトークン使用量は表示しません。

これは個人開発のプラグインであり、OpenAIまたはElgatoの公式製品ではありません。

## 参考資料

- [Codex App Server](https://learn.chatgpt.com/docs/app-server)
- [Elgato Neo Infobar](https://docs.elgato.com/streamdeck/sdk/guides/neo-infobar/)
- [Elgato Layouts](https://docs.elgato.com/streamdeck/sdk/references/layouts/)

## ライセンス

MIT。詳細は [LICENSE](LICENSE) を参照してください。
同梱ライブラリのライセンスは `THIRD_PARTY_NOTICES.txt` に収録しています。
