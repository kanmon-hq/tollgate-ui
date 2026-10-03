export type KeyStatus = 'active' | 'suspended' | 'rotating' | 'revoked'

export interface RotationMeta {
  old_key_hash?: string
  grace_period_expires_at?: string
}

export interface TollgateKey {
  key_id: string
  key_prefix: string
  name: string
  tenant_id?: string
  service_id?: string
  scopes: string[]
  rate_limit_rpm: number
  monthly_quota: number
  current_month_usage: number
  current_month: string
  status: KeyStatus
  is_active: boolean
  last_used_at?: string
  rotation?: RotationMeta
  expires_at?: number
  created_at: string
  updated_at: string
}

export interface CreateKeyInput {
  name: string
  tenant_id?: string
  service_id?: string
  scopes: string[]
  rate_limit_rpm?: number
  monthly_quota?: number
  expires_in?: number
}

export interface UpdateKeyInput {
  name?: string
  scopes?: string[]
  rate_limit_rpm?: number
  monthly_quota?: number
}

export interface CreateKeyOutput extends TollgateKey {
  raw_key: string
  key?: TollgateKey
}

export interface RotateKeyOutput {
  key_id: string
  key_prefix: string
  new_raw_key: string
  grace_period_expires_at: string
  key?: TollgateKey
}

export interface VerifyKeyResult {
  valid: boolean
  key_id?: string
  key_prefix?: string
  tenant_id?: string
  service_id?: string
  scopes?: string[]
  remaining_rpm?: number
  limit_rpm?: number
  remaining_quota?: number
  monthly_quota?: number
  reason?: string
}

export interface TenantOption {
  id: string
  name: string
}

export interface TollgateConfig {
  apiBaseUrl?: string
  adminToken?: string
  tenantId?: string
  tenants?: TenantOption[]
}
