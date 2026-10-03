import type {
  TollgateKey,
  CreateKeyInput,
  CreateKeyOutput,
  UpdateKeyInput,
  RotateKeyOutput,
  VerifyKeyResult
} from '../types'

export class TollgateApiClient {
  private baseUrl: string
  private adminToken?: string
  private tenantId?: string

  constructor(options?: { baseUrl?: string; adminToken?: string; tenantId?: string }) {
    this.baseUrl = (options?.baseUrl || '').replace(/\/$/, '')
    this.adminToken = options?.adminToken
    this.tenantId = options?.tenantId
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '')
  }

  public setAdminToken(token?: string) {
    this.adminToken = token
  }

  public setTenantId(id?: string) {
    this.tenantId = id
  }

  private async request<T>(path: string, options: RequestInit & { tenantId?: string } = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    }

    if (this.adminToken) {
      headers['Authorization'] = `Bearer ${this.adminToken}`
      headers['X-Admin-Secret'] = this.adminToken
    }

    const tId = options.tenantId || this.tenantId
    if (tId) {
      headers['X-Tenant-ID'] = tId
    }

    const res = await fetch(url, {
      ...options,
      headers
    })

    if (!res.ok) {
      let errMsg = `HTTP Error: ${res.status} ${res.statusText}`
      try {
        const errorJson = await res.json()
        errMsg = errorJson.message || errorJson.error || errorJson.detail || errMsg
      } catch {
        // fallback
      }
      throw new Error(errMsg)
    }

    if (res.status === 204) {
      return {} as T
    }

    return (await res.json()) as T
  }

  async fetchKeys(tenantId?: string): Promise<TollgateKey[]> {
    const query = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : ''
    const data = await this.request<{ keys?: TollgateKey[] } | TollgateKey[]>(`/api/keys/v1/keys${query}`, {
      tenantId
    })
    if (Array.isArray(data)) return data
    return data.keys || []
  }

  async fetchAllKeys(tenantIds: string[]): Promise<TollgateKey[]> {
    if (!tenantIds || tenantIds.length === 0) {
      return this.fetchKeys()
    }
    const results = await Promise.allSettled(
      tenantIds.map((tId) => this.fetchKeys(tId))
    )
    const allKeys: TollgateKey[] = []
    const seen = new Set<string>()
    for (const res of results) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        for (const k of res.value) {
          if (!seen.has(k.key_id)) {
            seen.add(k.key_id)
            allKeys.push(k)
          }
        }
      }
    }
    return allKeys
  }

  async createKey(input: CreateKeyInput): Promise<CreateKeyOutput> {
    const payload: Record<string, any> = { ...input }
    if (!payload.tenant_id?.trim()) {
      delete payload.tenant_id
    }
    if (!payload.service_id?.trim()) {
      payload.service_id = payload.tenant_id || 'default'
    }

    const res = await this.request<any>('/api/keys/v1/keys', {
      method: 'POST',
      body: JSON.stringify(payload),
      tenantId: input.tenant_id
    })

    return {
      ...res,
      raw_key: res.raw_key,
      key: res.key || res
    }
  }

  async updateKey(keyId: string, payload: UpdateKeyInput, tenantId?: string): Promise<TollgateKey> {
    return this.request<TollgateKey>(`/api/keys/v1/keys/${keyId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      tenantId
    })
  }

  async suspendKey(keyId: string, tenantId?: string): Promise<void> {
    await this.request(`/api/keys/v1/keys/${keyId}/suspend`, {
      method: 'POST',
      tenantId
    })
  }

  async resumeKey(keyId: string, tenantId?: string): Promise<void> {
    await this.request(`/api/keys/v1/keys/${keyId}/resume`, {
      method: 'POST',
      tenantId
    })
  }

  async rotateKey(keyId: string, gracePeriodSeconds = 86400, tenantId?: string): Promise<RotateKeyOutput> {
    return this.request<RotateKeyOutput>(`/api/keys/v1/keys/${keyId}/rotate`, {
      method: 'POST',
      body: JSON.stringify({ grace_period_seconds: gracePeriodSeconds }),
      tenantId
    })
  }

  async deleteKey(keyId: string, tenantId?: string): Promise<void> {
    await this.request(`/api/keys/v1/keys/${keyId}`, {
      method: 'DELETE',
      tenantId
    })
  }

  async verifyKey(rawKey: string, requiredScope?: string): Promise<VerifyKeyResult> {
    return this.request<VerifyKeyResult>('/api/keys/v1/verify', {
      method: 'POST',
      body: JSON.stringify({ raw_key: rawKey, required_scope: requiredScope })
    })
  }
}
