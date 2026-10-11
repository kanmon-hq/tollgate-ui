/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TOLLGATE_API_BASE_URL?: string
  readonly VITE_TOLLGATE_ADMIN_TOKEN?: string
  readonly VITE_TOLLGATE_TENANTS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
