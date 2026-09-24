// Payment abstraction. The prototype ships with a sandbox provider that never
// charges money. A production build swaps in a store provider (Google Play
// Billing / StoreKit via RevenueCat or a Capacitor purchases plugin) with
// the same interface; see README "การชำระเงินจริง".

import { signal } from '@preact/signals'

export interface PurchaseResult {
  ok: boolean
  transactionId?: string
  cancelled?: boolean
  error?: string
}

export interface PaymentProvider {
  readonly name: string
  readonly sandbox: boolean
  purchase(productId: string, priceTHB: number, title: string): Promise<PurchaseResult>
  restore?(): Promise<string[]>
}

/** State of the in-app confirmation sheet shown by the sandbox provider. */
export const pendingPurchase = signal<null | {
  productId: string
  priceTHB: number
  title: string
  resolve: (r: PurchaseResult) => void
}>(null)

export class SandboxPaymentProvider implements PaymentProvider {
  readonly name = 'sandbox'
  readonly sandbox = true
  purchase(productId: string, priceTHB: number, title: string): Promise<PurchaseResult> {
    return new Promise((resolve) => {
      pendingPurchase.value = { productId, priceTHB, title, resolve }
    })
  }
}

let provider: PaymentProvider = new SandboxPaymentProvider()

export function setPaymentProvider(p: PaymentProvider) {
  provider = p
}

export function payments(): PaymentProvider {
  return provider
}
