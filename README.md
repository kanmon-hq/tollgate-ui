# @kanmon-hq/tollgate-ui

**English** | [日本語](README.ja.md)

[![npm version](https://img.shields.io/npm/v/@kanmon-hq/tollgate-ui.svg)](https://www.npmjs.com/package/@kanmon-hq/tollgate-ui)
[![License](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)

An embeddable, framework-agnostic Web Components UI suite for the **Tollgate** API Gateway & Key Broker.  
Easily embed a full-featured API key management console into any frontend stack (Vue 3, React, Next.js, Angular, or Vanilla HTML) via a single `<tollgate-console>` custom element.

---

## Features

- ⚡ **Web Components (Custom Elements)**: Framework-independent, drops into any web app via `<tollgate-console>`.
- 🛡️ **Shadow DOM Style Isolation**: Zero CSS leakage. Completely isolated styling that never conflicts with host application stylesheets (Bootstrap, Tailwind, etc.).
- 🎨 **Feature-Rich Admin UI**: Built-in issuance, quota and RPM limits, graceful zero-downtime key rotation, suspensions, and real-time authorization testing.
- 🏢 **Multi-Tenant Native**: Seamless switching between tenants, scope selection, service key separation, and bulk tenant revocation.
- ⚙️ **Interactive Connection Settings**: Dynamic modal in the UI to update API Base URLs and Admin Tokens on the fly with `localStorage` persistence.

---

## Installation

### From npm (Recommended)

```bash
npm install @kanmon-hq/tollgate-ui
# or
pnpm add @kanmon-hq/tollgate-ui
# or
yarn add @kanmon-hq/tollgate-ui
```

### From GitHub Packages

Configure your `.npmrc` in the project root:

```ini
@kanmon-hq:registry=https://npm.pkg.github.com
```

Then install:

```bash
npm install @kanmon-hq/tollgate-ui
```

---

## Usage

### 1. Vanilla HTML / CDN

```html
<!DOCTYPE html>
<html lang="en">
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

### 2. Vue 3

```vue
<script setup lang="ts">
import '@kanmon-hq/tollgate-ui'
// Alternatively:
// import { registerTollgateUI } from '@kanmon-hq/tollgate-ui'
// registerTollgateUI()

const tenants = [
  { id: 'tenant-corp-a', name: 'Corp A' },
  { id: 'tenant-corp-b', name: 'Corp B' }
]
</script>

<template>
  <div class="p-6">
    <tollgate-console
      api-base-url="/api"
      admin-token="your-admin-secret"
      :tenants-json="tenants"
    />
  </div>
</template>
```

> **Vue 3 Tip**: If using Vite, configure `compilerOptions.isCustomElement: (tag) => tag.startsWith('tollgate-')` in `@vitejs/plugin-vue` to avoid custom element compiler warnings.

### 3. React / Next.js

```tsx
import React, { useEffect } from 'react'

export function TollgateAdminPage() {
  useEffect(() => {
    import('@kanmon-hq/tollgate-ui')
  }, [])

  const tenants = [
    { id: 'tenant-corp-a', name: 'Corp A' },
    { id: 'tenant-corp-b', name: 'Corp B' }
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

---

## Props (Attributes / Properties)

| Attribute | Type | Description | Default / Fallback |
|:---|:---|:---|:---|
| `api-base-url` | `string` | Base URL of the Tollgate server (e.g. `http://localhost:8000`, `/api`) | `""` / `VITE_TOLLGATE_API_BASE_URL` |
| `admin-token` | `string` | Master administrative secret / Bearer token | `""` / `VITE_TOLLGATE_ADMIN_TOKEN` |
| `tenant-id` | `string` | Restrict console to a specific tenant ID | `""` |
| `tenants-json` | `string` \| `TenantOption[]` | Array of selectable tenants (or JSON string) | `[]` |
| `embedded` | `boolean` | Hide header banner for cleaner embedded layouts | `false` |
| `title` | `string` | Header banner title text | `"API Key Gateway (Tollgate) Management Console"` |

---

## Environment Variables (Build Defaults)

When running locally or building default configuration bundles, fallbacks can be injected via `.env`:

```env
# Tollgate UI — Environment Variables
VITE_TOLLGATE_API_BASE_URL=http://localhost:8000
VITE_TOLLGATE_ADMIN_TOKEN=admin-secret-key-for-local-dev
```

---

## Configuration Resolution Order

Configuration values resolve in the following order of precedence:

1. **Interactive UI Overrides** (`localStorage` via connection settings modal)
2. **Component Attributes / Props** (`api-base-url`, `admin-token`, `tenants-json`)
3. **Build Environment Variables** (`VITE_TOLLGATE_*`) or Global Object (`window.__TOLLGATE_CONFIG__`)
4. **Defaults** (Same-origin relative path / empty strings)

---

## Development

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173/)
npm run dev

# Build Web Component library bundle
npm run build
```

---

## License

This project is licensed under the [Mozilla Public License 2.0 (MPL-2.0)](LICENSE).
