# @kanmon-hq/tollgate-ui

[English](README.md) | **日本語**

Tollgate API Gateway & Key Broker 向けの組み込み型 Web Components UI ライブラリ。  
Vue 3、React、Next.js、Vanilla HTML などあらゆるフロントエンド環境に単一のカスタム要素として簡単に組み込み可能です。

## 特徴

- ⚡ **Web Components (Custom Elements)**: フレームワークに依存せず `<tollgate-console>` タグで利用可能
- 🛡️ **Shadow DOM スコープ保護**: ホストアプリケーションの CSS と干渉しない完全隔離スタイリング
- 🎨 **リッチな管理 UI**: API キーの発行・クォータ管理・レートリミット制御・Graceful ローテーション・キー単体認可検証テスターを内蔵
- 🏢 **マルチテナント完全対応**: テナント切り替え、スコープ管理、サービスキー分離に対応

## インストール

### npm からインストール (推奨)

```bash
npm install @kanmon-hq/tollgate-ui
# または
pnpm add @kanmon-hq/tollgate-ui
# または
yarn add @kanmon-hq/tollgate-ui
```

### GitHub Packages からインストール

プロジェクト直下の `.npmrc` に以下を設定してインストールします：

```ini
@kanmon-hq:registry=https://npm.pkg.github.com
```

```bash
npm install @kanmon-hq/tollgate-ui
```

## 使い方

### 1. Vanilla HTML / CDN

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <script type="module" src="https://unpkg.com/@kanmon-hq/tollgate-ui/dist/tollgate-ui.js"></script>
</head>
<body class="bg-slate-950 p-8">
  <tollgate-console
    api-base-url="http://localhost:8000"
    admin-token="your-admin-secret"
    tenants-json='[{"id":"tenant-corp-a","name":"Corp A"},{"id":"tenant-corp-b","name":"Corp B"}]'
  ></tollgate-console>
</body>
</html>
```

### 2. Vue 3 での利用

```vue
<script setup lang="ts">
import '@kanmon-hq/tollgate-ui'
// または
// import { registerTollgateUI } from '@kanmon-hq/tollgate-ui'
// registerTollgateUI()

const tenants = [
  { id: 'tenant-corp-a', name: '企業 A' },
  { id: 'tenant-corp-b', name: '企業 B' }
]
</script>

<template>
  <div class="p-6">
    <tollgate-console
      api-base-url="/api"
      admin-token="secret-token"
      :tenants-json="tenants"
    />
  </div>
</template>
```

> **Note (Vue 3)**: Vite 設定等でカスタム要素として扱う場合は `compilerOptions.isCustomElement: (tag) => tag.startsWith('tollgate-')` を指定してください。

### 3. React / Next.js での利用

```tsx
import React, { useEffect } from 'react'

export function TollgateAdminPage() {
  useEffect(() => {
    import('@kanmon-hq/tollgate-ui')
  }, [])

  const tenants = [
    { id: 'tenant-corp-a', name: '企業 A' },
    { id: 'tenant-corp-b', name: '企業 B' }
  ]

  return (
    <div className="p-6">
      {/* @ts-ignore custom element */}
      <tollgate-console
        api-base-url={process.env.NEXT_PUBLIC_TOLLGATE_API_URL}
        admin-token="your-admin-secret"
        tenants-json={JSON.stringify(tenants)}
      />
    </div>
  )
}
```

## Props (Attributes / Properties)

| 属性名 | 型 | 説明 | デフォルト値 / 環境変数フォールバック |
| :--- | :--- | :--- | :--- |
| `api-base-url` | `string` | Tollgate サーバーの Base URL (例: `http://localhost:8000`, `/api`) | `""` / `VITE_TOLLGATE_API_BASE_URL` |
| `admin-token` | `string` | 管理者認可シークレット / Bearer トークン | `""` / `VITE_TOLLGATE_ADMIN_TOKEN` |
| `tenant-id` | `string` | 特定テナントに限定する場合のテナントID | `""` |
| `tenants-json` | `string` \| `TenantOption[]` | テナント一覧の配列（またはJSON文字列） | `[]` / `VITE_TOLLGATE_TENANTS` |
| `embedded` | `boolean` | ヘッダーを非表示にしてコンポーネントのみ埋め込むモード | `false` |
| `title` | `string` | ヘッダータイトル | `"API Key Gateway (Tollgate) 管理コンソール"` |

## 環境変数 (デフォルト設定)

ビルド時やローカル開発時、属性が省略された場合のデフォルト値を `.env` 等の環境変数で設定可能です：

```env
# Tollgate UI — Environment Variables
VITE_TOLLGATE_API_BASE_URL=http://localhost:8000
VITE_TOLLGATE_ADMIN_TOKEN=admin-secret-key-for-local-dev
VITE_TOLLGATE_TENANTS=[{"id":"tenant-risk-01","name":"Risk Division"},{"id":"tenant-finance-02","name":"Finance Division"}]
```

## UI 上での動的エンドポイント変更

- ヘッダー右上の **エンドポイントバッジ / 接続設定ボタン（⚙️）** をクリックすることで、モーダル上から API Base URL や Admin Token を動的に変更・接続テスト・即時リロードが可能です。
- UI 上で変更した設定はブラウザの `localStorage` に保持され、リロード後も維持されます。「初期値に戻す」ボタンで環境変数/Props のデフォルト値に戻すことができます。

## 解決優先順位 (Resolution Order)

1. **UI 手動設定** (`localStorage`)
2. **Props / Attributes** (`api-base-url`, `admin-token`, `tenants-json`)
3. **環境変数** (`VITE_TOLLGATE_*`) またはグローバル定義 (`window.__TOLLGATE_CONFIG__`)
4. **デフォルト値** (同一オリジン / 空文字)

## 開発

```bash
# 依存関係インストール
npm install

# 開発サーバー起動 (http://localhost:5173/)
npm run dev

# Web Components ライブラリビルド
npm run build
```

## ライセンス

MPL-2.0
