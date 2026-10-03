<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import {
  KeyRound,
  ShieldCheck,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Building2,
  Lock,
  Pause,
  Play,
  RotateCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Search,
  Sliders,
  Cpu,
  Database,
  Globe,
  Layers,
  AlertCircle,
  ExternalLink,
  Edit2
} from 'lucide-vue-next'
import { TollgateApiClient } from '../api/client'
import type {
  TollgateKey,
  CreateKeyInput,
  UpdateKeyInput,
  TenantOption,
  VerifyKeyResult
} from '../types'

// Props 定義 (Web Component の attribute / property としてマッピングされる)
const props = withDefaults(
  defineProps<{
    apiBaseUrl?: string
    adminToken?: string
    tenantId?: string
    tenantsJson?: string | TenantOption[]
    embedded?: boolean
    title?: string
  }>(),
  {
    apiBaseUrl: '',
    adminToken: '',
    tenantId: '',
    tenantsJson: () => [],
    embedded: false,
    title: 'API Key Gateway (Tollgate) 管理コンソール'
  }
)

// API クライアント
const client = new TollgateApiClient({
  baseUrl: props.apiBaseUrl,
  adminToken: props.adminToken,
  tenantId: props.tenantId
})

watch(() => props.apiBaseUrl, (url) => client.setBaseUrl(url || ''))
watch(() => props.adminToken, (tok) => client.setAdminToken(tok))
watch(() => props.tenantId, (tid) => client.setTenantId(tid))

// テナントリストのパース
const parsedTenants = computed<TenantOption[]>(() => {
  if (Array.isArray(props.tenantsJson)) {
    return props.tenantsJson
  }
  if (typeof props.tenantsJson === 'string' && props.tenantsJson.trim()) {
    try {
      return JSON.parse(props.tenantsJson)
    } catch {
      return []
    }
  }
  return []
})

// 状態管理
const keys = ref<TollgateKey[]>([])
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const activeTab = ref<'keys' | 'system'>('keys')

const searchQuery = ref('')
const selectedStatusFilter = ref<string>('all')
const selectedTenantFilter = ref<string>('all')

// モーダル制御
const showCreateModal = ref(false)
const showRawKeyModal = ref(false)
const showEditModal = ref(false)
const editingKey = ref<TollgateKey | null>(null)

const editKeyForm = ref({
  name: '',
  rate_limit_rpm: 600,
  monthly_quota: 0
})

const newlyCreatedRawKey = ref('')
const newlyCreatedKeyName = ref('')
const copySuccess = ref(false)

const newKeyForm = ref<CreateKeyInput>({
  name: '',
  tenant_id: '',
  service_id: '',
  scopes: ['ai:*', 'mcp:*', 'llm:*'],
  rate_limit_rpm: 600,
  monthly_quota: 100000,
  expires_in: 2592000 // 30 days
})
const createError = ref<string | null>(null)

// 検証ツール
const verifyInputKey = ref('')
const verifyInputScope = ref('ai:*')
const verifyResult = ref<VerifyKeyResult | null>(null)
const isVerifying = ref(false)

// フィルタ済みキー一覧
const filteredKeys = computed(() => {
  return keys.value.filter((key) => {
    const q = searchQuery.value.toLowerCase()
    const matchesSearch =
      !q ||
      key.name.toLowerCase().includes(q) ||
      key.key_prefix.toLowerCase().includes(q) ||
      (key.tenant_id ? key.tenant_id.toLowerCase().includes(q) : false) ||
      (key.service_id ? key.service_id.toLowerCase().includes(q) : false)

    const matchesStatus =
      selectedStatusFilter.value === 'all' || key.status === selectedStatusFilter.value

    const matchesTenant =
      selectedTenantFilter.value === 'all' ||
      (selectedTenantFilter.value === 'service_only'
        ? !key.tenant_id
        : key.tenant_id === selectedTenantFilter.value)

    return matchesSearch && matchesStatus && matchesTenant
  })
})

// メトリクス集計
const activeKeysCount = computed(() => keys.value.filter((k) => k.status === 'active').length)
const totalMonthlyUsage = computed(() =>
  keys.value.reduce((sum, k) => sum + (k.current_month_usage || 0), 0)
)
const rotatingKeysCount = computed(() => keys.value.filter((k) => k.status === 'rotating').length)

const isCreateKeyValid = computed(() => {
  const hasName = !!newKeyForm.value.name.trim()
  const hasTenantOrService = !!(
    newKeyForm.value.tenant_id?.trim() || newKeyForm.value.service_id?.trim()
  )
  return hasName && hasTenantOrService
})

function getTenantName(tenantId?: string): string {
  if (!tenantId) return 'サービス専用 (マルチテナント)'
  const found = parsedTenants.value.find((t) => t.id === tenantId)
  return found ? found.name : tenantId
}

// データ読み込み
async function loadAllKeys() {
  loading.value = true
  errorMessage.value = null
  try {
    const tenantIds = parsedTenants.value.map((t) => t.id)
    if (tenantIds.length > 0) {
      keys.value = await client.fetchAllKeys(tenantIds)
    } else {
      keys.value = await client.fetchKeys(props.tenantId || undefined)
    }
  } catch (err: any) {
    console.error('Failed to load Tollgate keys:', err)
    errorMessage.value = err.message || 'APIキー一覧の取得に失敗しました'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (parsedTenants.value.length > 0 && !newKeyForm.value.tenant_id) {
    newKeyForm.value.tenant_id = parsedTenants.value[0].id
  }
  loadAllKeys()
})

// キー発行
function openCreateModal() {
  createError.value = null
  if (parsedTenants.value.length > 0 && !newKeyForm.value.tenant_id) {
    newKeyForm.value.tenant_id = parsedTenants.value[0].id
  }
  showCreateModal.value = true
}

async function submitCreateKey() {
  createError.value = null
  if (!isCreateKeyValid.value) {
    createError.value = 'キー名称を入力し、所属テナントまたはサービス識別子を指定してください。'
    return
  }
  try {
    const res = await client.createKey(newKeyForm.value)
    newlyCreatedRawKey.value = res.raw_key
    newlyCreatedKeyName.value = res.key?.name || res.name || newKeyForm.value.name
    showCreateModal.value = false
    showRawKeyModal.value = true

    if (res.key) {
      keys.value.unshift(res.key)
    } else {
      await loadAllKeys()
    }

    newKeyForm.value = {
      name: '',
      tenant_id: parsedTenants.value[0]?.id || '',
      service_id: '',
      scopes: ['ai:*', 'mcp:*', 'llm:*'],
      rate_limit_rpm: 600,
      monthly_quota: 100000,
      expires_in: 2592000
    }
  } catch (err: any) {
    console.error('Create key failed:', err)
    createError.value = err.message || 'APIキーの発行に失敗しました。'
  }
}

// 編集
function openEditModal(key: TollgateKey) {
  editingKey.value = key
  editKeyForm.value = {
    name: key.name,
    rate_limit_rpm: key.rate_limit_rpm || 600,
    monthly_quota: key.monthly_quota || 0
  }
  showEditModal.value = true
}

async function submitUpdateKey() {
  if (!editingKey.value) return
  try {
    const updated = await client.updateKey(
      editingKey.value.key_id,
      {
        name: editKeyForm.value.name.trim(),
        rate_limit_rpm: Number(editKeyForm.value.rate_limit_rpm),
        monthly_quota: Number(editKeyForm.value.monthly_quota)
      },
      editingKey.value.tenant_id
    )
    const idx = keys.value.findIndex((k) => k.key_id === editingKey.value?.key_id)
    if (idx !== -1 && updated) {
      keys.value[idx] = { ...keys.value[idx], ...updated }
    }
    showEditModal.value = false
    editingKey.value = null
  } catch (err: any) {
    alert(err.message || 'APIキーの更新に失敗しました')
  }
}

// 操作
async function handleSuspend(key: TollgateKey) {
  if (!confirm(`APIキー「${key.name}」を一時停止しますか？`)) return
  try {
    await client.suspendKey(key.key_id, key.tenant_id)
    key.status = 'suspended'
    key.is_active = false
  } catch (err: any) {
    alert(err.message || '一時停止に失敗しました')
  }
}

async function handleResume(key: TollgateKey) {
  try {
    await client.resumeKey(key.key_id, key.tenant_id)
    key.status = 'active'
    key.is_active = true
  } catch (err: any) {
    alert(err.message || '再開に失敗しました')
  }
}

async function handleRotate(key: TollgateKey) {
  if (
    !confirm(
      `APIキー「${key.name}」をローテーションしますか？\n（旧キーは24時間の猶予期間後に無効化されます）`
    )
  )
    return
  try {
    const res = await client.rotateKey(key.key_id, 86400, key.tenant_id)
    newlyCreatedRawKey.value = res.new_raw_key
    newlyCreatedKeyName.value = `${key.name} (新ローテーションキー)`
    key.status = 'rotating'
    showRawKeyModal.value = true
  } catch (err: any) {
    alert(err.message || 'ローテーションに失敗しました')
  }
}

async function handleDelete(key: TollgateKey) {
  if (!confirm(`APIキー「${key.name}」を完全に削除しますか？\nこの操作は取り消せません。`)) return
  try {
    await client.deleteKey(key.key_id, key.tenant_id)
    keys.value = keys.value.filter((k) => k.key_id !== key.key_id)
  } catch (err: any) {
    alert(err.message || '削除に失敗しました')
  }
}

// 単体検証
async function runVerify() {
  if (!verifyInputKey.value.trim()) return
  isVerifying.value = true
  verifyResult.value = null
  try {
    verifyResult.value = await client.verifyKey(
      verifyInputKey.value.trim(),
      verifyInputScope.value
    )
  } catch (err: any) {
    verifyResult.value = { valid: false, reason: err.message }
  } finally {
    isVerifying.value = false
  }
}

function copyRawKey() {
  navigator.clipboard.writeText(newlyCreatedRawKey.value)
  copySuccess.value = true
  setTimeout(() => {
    copySuccess.value = false
  }, 2000)
}
</script>

<template>
  <div class="tollgate-root min-h-[600px] w-full bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans antialiased space-y-8 rounded-2xl border border-slate-800/80 shadow-2xl">
    
    <!-- ページヘッダー -->
    <div v-if="!embedded" class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-inner">
          <KeyRound class="w-6 h-6" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl sm:text-2xl font-black tracking-tight text-white">{{ title }}</h1>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              Active Gateway
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-400 mt-1">
            マルチテナント API キー発行・クォータ上限・レートリミット (RPM)・Graceful ローテーション統制
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="openCreateModal"
          class="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all active:scale-95 cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>新規 API キー発行</span>
        </button>

        <button
          @click="loadAllKeys"
          :disabled="loading"
          class="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
          title="更新"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- エラーメッセージ通知 -->
    <div v-if="errorMessage" class="p-4 bg-rose-950/40 border border-rose-800/80 rounded-2xl flex items-center gap-3 text-rose-300 text-xs sm:text-sm">
      <AlertCircle class="w-5 h-5 text-rose-400 shrink-0" />
      <span class="flex-1">{{ errorMessage }}</span>
      <button @click="loadAllKeys" class="underline font-bold hover:text-rose-100">再試行</button>
    </div>

    <!-- 4大メトリクスカード -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden group hover:border-cyan-500/30 transition-all">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">登録済みキー総数</span>
          <div class="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <KeyRound class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-black text-white">{{ keys.length }}</span>
          <span class="text-xs text-slate-500 font-medium">Keys</span>
        </div>
        <p class="mt-1 text-[11px] text-slate-400">マルチテナント &amp; サービスキー</p>
      </div>

      <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-all">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">有効稼働中キー</span>
          <div class="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-black text-emerald-400">{{ activeKeysCount }}</span>
          <span class="text-xs text-slate-500 font-medium">Keys</span>
        </div>
        <p class="mt-1 text-[11px] text-slate-400">アクティブ認可トラフィック</p>
      </div>

      <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden group hover:border-indigo-500/30 transition-all">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">当月リクエスト総利用</span>
          <div class="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <RefreshCw class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-black text-indigo-400">{{ totalMonthlyUsage.toLocaleString() }}</span>
          <span class="text-xs text-slate-500 font-medium">req</span>
        </div>
        <p class="mt-1 text-[11px] text-slate-400">全社累計消費リクエスト数</p>
      </div>

      <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition-all">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">ローテーション移行中</span>
          <div class="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <RotateCw class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-black text-amber-400">{{ rotatingKeysCount }}</span>
          <span class="text-xs text-slate-500 font-medium">Keys</span>
        </div>
        <p class="mt-1 text-[11px] text-slate-400">Grace Period 猶予中 (24h)</p>
      </div>
    </div>

    <!-- タブ切り替え -->
    <div class="flex items-center gap-2 border-b border-slate-800">
      <button
        @click="activeTab = 'keys'"
        class="pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer"
        :class="activeTab === 'keys' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'"
      >
        <KeyRound class="w-4 h-4" />
        <span>API キー管理</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-medium">
          {{ keys.length }}
        </span>
      </button>

      <button
        @click="activeTab = 'system'"
        class="pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer"
        :class="activeTab === 'system' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'"
      >
        <Sliders class="w-4 h-4" />
        <span>システム構成 &amp; ルーティング</span>
      </button>
    </div>

    <!-- ─── タブ 1: API キー管理 ──────────────────────────────────────── -->
    <div v-if="activeTab === 'keys'" class="space-y-6">
      
      <!-- 検索 & フィルタバー -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-3 w-full sm:w-auto flex-1">
          <!-- 検索インプット -->
          <div class="relative flex-1 max-w-md">
            <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="キー名, プレフィックス, テナントIDで検索..."
              class="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <!-- テナント絞り込みフィルタ -->
          <div v-if="parsedTenants.length > 0" class="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 shrink-0">
            <Building2 class="w-4 h-4 text-cyan-400 shrink-0" />
            <span class="text-xs text-slate-400 font-medium">テナント:</span>
            <select
              v-model="selectedTenantFilter"
              class="bg-transparent border-0 text-cyan-300 text-xs font-bold focus:outline-none cursor-pointer pr-2 py-0.5 max-w-[160px] truncate"
            >
              <option value="all" class="bg-slate-900 text-slate-200">すべてのテナント</option>
              <option value="service_only" class="bg-slate-900 text-purple-300">サービス専用 (未指定)</option>
              <option
                v-for="t in parsedTenants"
                :key="t.id"
                :value="t.id"
                class="bg-slate-900 text-slate-200 font-normal"
              >
                {{ t.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <button
            v-for="st in ['all', 'active', 'suspended', 'rotating', 'revoked']"
            :key="st"
            @click="selectedStatusFilter = st"
            class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize shrink-0 cursor-pointer"
            :class="selectedStatusFilter === st
              ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'"
          >
            {{ st === 'all' ? 'すべての状態' : st }}
          </button>
        </div>
      </div>

      <!-- テーブル -->
      <div class="bg-slate-900/60 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div class="p-4 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <KeyRound class="w-4 h-4 text-cyan-400" />
            <h2 class="text-sm font-bold text-white">発行済み API キー一覧</h2>
          </div>
          <span class="text-xs text-slate-500 font-medium">該当: {{ filteredKeys.length }} 件</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr class="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                <th class="py-3 px-4">キー名称 / プレフィックス</th>
                <th class="py-3 px-4">テナント / サービス</th>
                <th class="py-3 px-4">ステータス</th>
                <th class="py-3 px-4">レートリミット (RPM)</th>
                <th class="py-3 px-4">月間クォータ利用</th>
                <th class="py-3 px-4">スコープ</th>
                <th class="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 text-slate-200">
              <tr
                v-for="k in filteredKeys"
                :key="k.key_id"
                class="hover:bg-slate-800/30 transition-colors"
              >
                <!-- キー名称 / プレフィックス -->
                <td class="py-3 px-4">
                  <div class="font-bold text-white flex items-center gap-2">
                    <span>{{ k.name }}</span>
                    <span v-if="k.rotation?.grace_period_expires_at" class="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                      移行中
                    </span>
                  </div>
                  <div class="text-[11px] font-mono text-cyan-400/90 mt-0.5">
                    {{ k.key_prefix }}...
                  </div>
                </td>

                <!-- テナント / サービス -->
                <td class="py-3 px-4">
                  <div class="font-medium text-slate-300">
                    {{ getTenantName(k.tenant_id) }}
                  </div>
                  <div v-if="k.service_id" class="text-[11px] text-slate-500 font-mono">
                    svc: {{ k.service_id }}
                  </div>
                </td>

                <!-- ステータス -->
                <td class="py-3 px-4">
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize"
                    :class="{
                      'bg-emerald-950/60 text-emerald-300 border-emerald-800/80': k.status === 'active',
                      'bg-amber-950/60 text-amber-300 border-amber-800/80': k.status === 'suspended' || k.status === 'rotating',
                      'bg-rose-950/60 text-rose-300 border-rose-800/80': k.status === 'revoked'
                    }"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="{
                      'bg-emerald-400 animate-pulse': k.status === 'active',
                      'bg-amber-400': k.status === 'suspended' || k.status === 'rotating',
                      'bg-rose-400': k.status === 'revoked'
                    }"></span>
                    {{ k.status }}
                  </span>
                </td>

                <!-- レートリミット (RPM) -->
                <td class="py-3 px-4 font-mono text-slate-300">
                  {{ k.rate_limit_rpm ? `${k.rate_limit_rpm.toLocaleString()} RPM` : '無制限' }}
                </td>

                <!-- 月間クォータ利用 -->
                <td class="py-3 px-4">
                  <div class="text-xs font-mono font-bold text-slate-200">
                    {{ (k.current_month_usage || 0).toLocaleString() }}
                    <span class="text-slate-500 font-normal">/ {{ k.monthly_quota > 0 ? k.monthly_quota.toLocaleString() : '無制限' }}</span>
                  </div>
                  <div v-if="k.monthly_quota > 0" class="w-24 bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="(k.current_month_usage / k.monthly_quota) > 0.9 ? 'bg-rose-500' : 'bg-cyan-500'"
                      :style="{ width: `${Math.min(100, Math.round(((k.current_month_usage || 0) / k.monthly_quota) * 100))}%` }"
                    ></div>
                  </div>
                </td>

                <!-- スコープ -->
                <td class="py-3 px-4">
                  <div class="flex flex-wrap gap-1 max-w-[180px]">
                    <span
                      v-for="sc in k.scopes"
                      :key="sc"
                      class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
                    >
                      {{ sc }}
                    </span>
                  </div>
                </td>

                <!-- アクション -->
                <td class="py-3 px-4 text-right space-x-1">
                  <!-- 編集 -->
                  <button
                    @click="openEditModal(k)"
                    class="p-1.5 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title="キー設定変更"
                  >
                    <Edit2 class="w-3.5 h-3.5" />
                  </button>

                  <!-- 一時停止 / 再開 -->
                  <button
                    v-if="k.status === 'active'"
                    @click="handleSuspend(k)"
                    class="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title="一時停止"
                  >
                    <Pause class="w-3.5 h-3.5" />
                  </button>
                  <button
                    v-else-if="k.status === 'suspended'"
                    @click="handleResume(k)"
                    class="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title="再開"
                  >
                    <Play class="w-3.5 h-3.5" />
                  </button>

                  <!-- ローテーション -->
                  <button
                    @click="handleRotate(k)"
                    class="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title="ローテーション (Graceful)"
                  >
                    <RotateCw class="w-3.5 h-3.5" />
                  </button>

                  <!-- 削除 -->
                  <button
                    @click="handleDelete(k)"
                    class="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title="完全削除"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>

              <tr v-if="filteredKeys.length === 0 && !loading">
                <td colspan="7" class="py-12 text-center text-slate-500">
                  <KeyRound class="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>該当する API キーは見つかりませんでした。</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 単体検証ツール (Verify Key Tester) -->
      <div class="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
        <div class="flex items-center gap-2 pb-2 border-b border-slate-800">
          <ShieldCheck class="w-4 h-4 text-cyan-400" />
          <h3 class="text-sm font-bold text-white">API キー単体検証・認可シミュレータ (Verify Tester)</h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-2 space-y-2">
            <label class="text-xs font-semibold text-slate-400">生の API キー (Raw API Key)</label>
            <input
              v-model="verifyInputKey"
              type="text"
              placeholder="tlgt_live_..."
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div class="space-y-2">
            <label class="text-xs font-semibold text-slate-400">要求スコープ (Scope)</label>
            <div class="flex gap-2">
              <input
                v-model="verifyInputScope"
                type="text"
                placeholder="ai:*"
                class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <button
                @click="runVerify"
                :disabled="isVerifying || !verifyInputKey.trim()"
                class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                {{ isVerifying ? '検証中...' : '検証実行' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 検証結果カード -->
        <div v-if="verifyResult" class="p-4 rounded-xl border text-xs" :class="verifyResult.valid ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300' : 'bg-rose-950/30 border-rose-800/60 text-rose-300'">
          <div class="flex items-center gap-2 font-bold mb-2">
            <CheckCircle2 v-if="verifyResult.valid" class="w-4 h-4 text-emerald-400" />
            <XCircle v-else class="w-4 h-4 text-rose-400" />
            <span>{{ verifyResult.valid ? '認可成功 (Valid & Authorized)' : '認可失敗 (Invalid / Unauthorized)' }}</span>
          </div>

          <div v-if="verifyResult.valid" class="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-slate-300 mt-2">
            <div><span class="text-slate-500">Key ID:</span> {{ verifyResult.key_id }}</div>
            <div><span class="text-slate-500">Prefix:</span> {{ verifyResult.key_prefix }}</div>
            <div><span class="text-slate-500">Tenant:</span> {{ verifyResult.tenant_id || 'Global' }}</div>
            <div><span class="text-slate-500">Remain RPM:</span> {{ verifyResult.remaining_rpm }} / {{ verifyResult.limit_rpm }}</div>
          </div>
          <div v-else class="text-rose-400 font-mono text-[11px] mt-1">
            理由: {{ verifyResult.reason || '検証できませんでした' }}
          </div>
        </div>
      </div>
    </div>

    <!-- ─── タブ 2: システム構成 & ルーティング ──────────────────────── -->
    <div v-if="activeTab === 'system'" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-3">
          <div class="flex items-center gap-2 text-cyan-400">
            <Layers class="w-5 h-5" />
            <h3 class="font-bold text-white text-sm">Tollgate アーキテクチャ</h3>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Tollgate はマルチテナント環境における API キーの発行・暗号化保管・レートリミット（Redis Token Bucket）・動的ローテーションを提供する認証認可プロキシゲートウェイです。
          </p>
        </div>

        <div class="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-3">
          <div class="flex items-center gap-2 text-indigo-400">
            <RotateCw class="w-5 h-5" />
            <h3 class="font-bold text-white text-sm">Graceful ローテーション</h3>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            API キーのローテーション時、即座に旧キーを破棄せず、設定された猶予期間（デフォルト24時間）は新旧両方のキーでリクエストを受け付けるため、クライアント側のダウンタイムゼロ更新を実現します。
          </p>
        </div>

        <div class="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-3">
          <div class="flex items-center gap-2 text-emerald-400">
            <Lock class="w-5 h-5" />
            <h3 class="font-bold text-white text-sm">Fail-Fast セキュリティ</h3>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            ヘッダーで指定されたテナントIDとキーの属性値が一致しない場合や、クォータ超過・失効キーのアクセスは即座に 403 Forbidden で遮断し、バックエンドへの不正侵入を防ぎます。
          </p>
        </div>
      </div>
    </div>

    <!-- ─── モーダル: 新規 API キー発行 ──────────────────────────────── -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <KeyRound class="w-5 h-5 text-cyan-400" />
            <h3 class="text-base font-bold text-white">新規 API キー発行</h3>
          </div>
          <button @click="showCreateModal = false" class="text-slate-400 hover:text-white cursor-pointer">&times;</button>
        </div>

        <div v-if="createError" class="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300">
          {{ createError }}
        </div>

        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-semibold text-slate-300 mb-1">キー名称 *</label>
            <input
              v-model="newKeyForm.name"
              type="text"
              placeholder="例: AI Engine Production Key"
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-300 mb-1">テナント (任意)</label>
              <select
                v-model="newKeyForm.tenant_id"
                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="">サービス専用 (マルチテナント)</option>
                <option v-for="t in parsedTenants" :key="t.id" :value="t.id">
                  {{ t.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block font-semibold text-slate-300 mb-1">サービス ID (任意)</label>
              <input
                v-model="newKeyForm.service_id"
                type="text"
                placeholder="例: internal_app"
                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-300 mb-1">レートリミット (RPM)</label>
              <input
                v-model.number="newKeyForm.rate_limit_rpm"
                type="number"
                min="0"
                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label class="block font-semibold text-slate-300 mb-1">月間クォータ (0 = 無制限)</label>
              <input
                v-model.number="newKeyForm.monthly_quota"
                type="number"
                min="0"
                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            @click="showCreateModal = false"
            class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
          >
            キャンセル
          </button>
          <button
            @click="submitCreateKey"
            class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/30 cursor-pointer"
          >
            発行する
          </button>
        </div>
      </div>
    </div>

    <!-- ─── モーダル: 発行キー確認 (Raw Key 一度きり表示) ───────────────── -->
    <div v-if="showRawKeyModal" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-slate-900 border border-emerald-800/60 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-base font-bold text-white">API キーが発行されました</h3>
            <p class="text-xs text-slate-400">{{ newlyCreatedKeyName }}</p>
          </div>
        </div>

        <div class="p-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl space-y-2">
          <div class="flex items-center gap-2 text-amber-400 text-xs font-bold">
            <AlertTriangle class="w-4 h-4" />
            <span>重要: このキーは二度と表示されません</span>
          </div>
          <p class="text-[11px] text-amber-200/80 leading-relaxed">
            安全なキーストアまたはシークレットマネージャーに今すぐ保存してください。
          </p>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-slate-400">生成された生の API キー (Raw API Key)</label>
          <div class="flex items-center gap-2 bg-slate-950 border border-slate-700/80 rounded-xl p-2.5">
            <span class="flex-1 font-mono text-xs text-emerald-300 select-all break-all">{{ newlyCreatedRawKey }}</span>
            <button
              @click="copyRawKey"
              class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
            >
              <Check v-if="copySuccess" class="w-3.5 h-3.5 text-emerald-400" />
              <Copy v-else class="w-3.5 h-3.5" />
              <span>{{ copySuccess ? 'コピー完了' : 'コピー' }}</span>
            </button>
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <button
            @click="showRawKeyModal = false"
            class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer"
          >
            保存した・閉じる
          </button>
        </div>
      </div>
    </div>

    <!-- ─── モーダル: キー設定更新 ────────────────────────────────────── -->
    <div v-if="showEditModal && editingKey" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="text-base font-bold text-white">API キー設定の更新</h3>
          <button @click="showEditModal = false" class="text-slate-400 hover:text-white cursor-pointer">&times;</button>
        </div>

        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-semibold text-slate-300 mb-1">キー名称</label>
            <input
              v-model="editKeyForm.name"
              type="text"
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-300 mb-1">レートリミット (RPM)</label>
            <input
              v-model.number="editKeyForm.rate_limit_rpm"
              type="number"
              min="0"
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-300 mb-1">月間クォータ (0 = 無制限)</label>
            <input
              v-model.number="editKeyForm.monthly_quota"
              type="number"
              min="0"
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            @click="showEditModal = false"
            class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
          >
            キャンセル
          </button>
          <button
            @click="submitUpdateKey"
            class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            更新を保存
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style>
@import '../styles/main.css';
</style>
