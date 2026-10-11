import type {
  TollgateKey,
  CreateKeyInput,
  CreateKeyOutput,
  UpdateKeyInput,
  RotateKeyOutput,
  VerifyKeyResult,
  KeyStats
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

  public getBaseUrl(): string {
    return this.baseUrl
  }

  public setBaseUrl(url: string) {
    this.baseUrl = (url || '').replace(/\/$/, '')
  }

  public getAdminToken(): string | undefined {
    return this.adminToken
  }

  public setAdminToken(token?: string) {
    this.adminToken = token
  }

  public getTenantId(): string | undefined {
    return this.tenantId
  }

  public setTenantId(id?: string) {
    this.tenantId = id
  }

  async checkHealth(): Promise<{ status: string; service?: string }> {
    return this.request<{ status: string; service?: string }>('/livez')
  }

  async checkAdminAuth(tenantId?: string): Promise<boolean> {
    try {
      await this.fetchKeys(tenantId)
      return true
    } catch {
      return false
    }
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
        if (errorJson.errors && Array.isArray(errorJson.errors) && errorJson.errors.length > 0) {
          const details = errorJson.errors
            .map((e: any) => (e.message ? `${e.location ? e.location + ': ' : ''}${e.message}` : JSON.stringify(e)))
            .join(', ')
          errMsg = `${errorJson.detail || 'Validation failed'}: ${details}`
        } else {
          errMsg = errorJson.message || errorJson.error || errorJson.detail || errMsg
        }
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

  async fetchKeys(options?: string | { tenantId?: string; serviceId?: string; limit?: number; cursor?: string }): Promise<{ keys: TollgateKey[]; nextCursor?: string }> {
    let tenantId: string | undefined
    let serviceId: string | undefined
    let limit: number | undefined
    let cursor: string | undefined

    if (typeof options === 'string') {
      tenantId = options
    } else if (options) {
      tenantId = options.tenantId
      serviceId = options.serviceId
      limit = options.limit
      cursor = options.cursor
    }

    const params = new URLSearchParams()
    if (tenantId) params.set('tenant_id', tenantId)
    if (serviceId) params.set('service_id', serviceId)
    if (limit) params.set('limit', String(limit))
    if (cursor) params.set('cursor', cursor)

    const query = params.toString() ? `?${params.toString()}` : ''
    const data = await this.request<{ keys?: TollgateKey[]; next_cursor?: string } | TollgateKey[]>(`/v1/admin/keys${query}`, {
      tenantId
    })
    if (Array.isArray(data)) return { keys: data }
    return {
      keys: data.keys || [],
      nextCursor: data.next_cursor
    }
  }

  async fetchStats(tenantId?: string, serviceId?: string): Promise<KeyStats> {
    const params = new URLSearchParams()
    if (tenantId) params.set('tenant_id', tenantId)
    if (serviceId) params.set('service_id', serviceId)
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request<KeyStats>(`/v1/admin/stats${query}`, { tenantId })
  }

  async fetchAllKeys(tenantIds: string[]): Promise<TollgateKey[]> {
    if (!tenantIds || tenantIds.length === 0) {
      const res = await this.fetchKeys()
      return res.keys
    }
    const results = await Promise.allSettled(
      tenantIds.map((tId) => this.fetchKeys(tId))
    )
    const allKeys: TollgateKey[] = []
    const seen = new Set<string>()
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value && Array.isArray(res.value.keys)) {
        for (const k of res.value.keys) {
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

    const res = await this.request<any>('/v1/admin/keys', {
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
    return this.request<TollgateKey>(`/v1/admin/keys/${keyId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      tenantId
    })
  }

  async suspendKey(keyId: string, tenantId?: string): Promise<void> {
    await this.request(`/v1/admin/keys/${keyId}/suspend`, {
      method: 'POST',
      tenantId
    })
  }

  async resumeKey(keyId: string, tenantId?: string): Promise<void> {
    await this.request(`/v1/admin/keys/${keyId}/resume`, {
      method: 'POST',
      tenantId
    })
  }

  async rotateKey(keyId: string, gracePeriodHours = 24, tenantId?: string): Promise<RotateKeyOutput> {
    return this.request<RotateKeyOutput>(`/v1/admin/keys/${keyId}/rotate`, {
      method: 'POST',
      body: JSON.stringify({
        grace_period_hours: gracePeriodHours
      }),
      tenantId
    })
  }

  async deleteKey(keyId: string, tenantId?: string): Promise<void> {
    await this.request(`/v1/admin/keys/${keyId}`, {
      method: 'DELETE',
      tenantId
    })
  }

  async verifyKey(rawKey: string, requiredScope?: string): Promise<VerifyKeyResult> {
    return this.request<VerifyKeyResult>('/v1/admin/verify', {
      method: 'POST',
      body: JSON.stringify({ raw_key: rawKey, required_scope: requiredScope })
    })
  }
}
