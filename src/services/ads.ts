// Rewarded-ad abstraction. The demo provider shows a short in-app placeholder
// ad; production swaps in AdMob rewarded ads (e.g. @capacitor-community/admob)
// behind the same interface.

import { signal } from '@preact/signals'

export type AdPlacement = 'free_coins' | 'double_reward' | 'extra_lottery' | 'login_double' | 'tv_coins'

export interface AdResult {
  rewarded: boolean
}

export interface AdProvider {
  readonly name: string
  showRewarded(placement: AdPlacement): Promise<AdResult>
}

export const activeAd = signal<null | { placement: AdPlacement; resolve: (r: AdResult) => void }>(null)

export class DemoAdProvider implements AdProvider {
  readonly name = 'demo'
  showRewarded(placement: AdPlacement): Promise<AdResult> {
    return new Promise((resolve) => {
      activeAd.value = { placement, resolve }
    })
  }
}

let provider: AdProvider = new DemoAdProvider()

export function setAdProvider(p: AdProvider) {
  provider = p
}

export function ads(): AdProvider {
  return provider
}
