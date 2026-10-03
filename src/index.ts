import { defineCustomElement } from 'vue'
import TollgateConsoleSFC from './components/TollgateConsole.ce.vue'
import { TollgateApiClient } from './api/client'
import type {
  TollgateKey,
  KeyStatus,
  CreateKeyInput,
  CreateKeyOutput,
  UpdateKeyInput,
  RotateKeyOutput,
  VerifyKeyResult,
  TenantOption,
  TollgateConfig
} from './types'

// Custom Element の定義
export const TollgateConsoleElement = defineCustomElement(TollgateConsoleSFC)

/**
 * Web Components を登録する関数
 * @param tagName カスタムタグ名 (デフォルト: 'tollgate-console')
 */
export function registerTollgateUI(tagName = 'tollgate-console') {
  if (typeof window !== 'undefined' && !customElements.get(tagName)) {
    customElements.define(tagName, TollgateConsoleElement)
  }
}

// 自動登録 (スクリプトタグでの読み込み時など)
if (typeof window !== 'undefined') {
  registerTollgateUI()
}

// エクスポート一覧
export {
  TollgateConsoleSFC,
  TollgateApiClient
}

export type {
  TollgateKey,
  KeyStatus,
  CreateKeyInput,
  CreateKeyOutput,
  UpdateKeyInput,
  RotateKeyOutput,
  VerifyKeyResult,
  TenantOption,
  TollgateConfig
}

export default registerTollgateUI
