/**
 * 環境変数およびグローバル設定の安全な取得ユーティリティ
 */

// グローバル window 型定義の拡張
declare global {
  interface Window {
    __TOLLGATE_CONFIG__?: {
      apiBaseUrl?: string
      adminToken?: string
      tenantId?: string
      tenantsJson?: string
    }
  }
}

/**
 * デフォルトの API Base URL を取得する
 * 解決優先順位:
 * 1. import.meta.env.VITE_TOLLGATE_API_BASE_URL
 * 2. window.__TOLLGATE_CONFIG__.apiBaseUrl
 * 3. '' (空文字: 同一ホスト / リバースプロキシ経由)
 */
export function getDefaultApiBaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TOLLGATE_API_BASE_URL) {
    return import.meta.env.VITE_TOLLGATE_API_BASE_URL
  }
  if (typeof window !== 'undefined' && window.__TOLLGATE_CONFIG__?.apiBaseUrl) {
    return window.__TOLLGATE_CONFIG__.apiBaseUrl
  }
  return ''
}

/**
 * デフォルトの管理者トークンを取得する
 * 解決優先順位:
 * 1. import.meta.env.VITE_TOLLGATE_ADMIN_TOKEN
 * 2. window.__TOLLGATE_CONFIG__.adminToken
 * 3. ''
 */
export function getDefaultAdminToken(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TOLLGATE_ADMIN_TOKEN) {
    return import.meta.env.VITE_TOLLGATE_ADMIN_TOKEN
  }
  if (typeof window !== 'undefined' && window.__TOLLGATE_CONFIG__?.adminToken) {
    return window.__TOLLGATE_CONFIG__.adminToken
  }
  return ''
}

/**
 * デフォルトのテナント一覧 (JSON文字列) を取得する
 */
export function getDefaultTenantsJson(): string {
  if (typeof window !== 'undefined' && window.__TOLLGATE_CONFIG__?.tenantsJson) {
    return window.__TOLLGATE_CONFIG__.tenantsJson
  }
  return ''
}
