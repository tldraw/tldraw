import * as React from 'react'
import type { TLNuSubscriptionCallback } from '~types'
import type { TLNuApp, TLNuShape } from '~nu-lib'

declare const window: Window & { tln: TLNuApp<any> }

export function useSetup<S extends TLNuShape, R extends TLNuApp<S>>(
  app: R,
  onMount: TLNuSubscriptionCallback<S, R, 'mount'>,
  onPersist: TLNuSubscriptionCallback<S, R, 'persist'>
) {
  React.useLayoutEffect(() => {
    const unsubs: (() => void)[] = []
    if (!app) return
    app.history.reset()
    if (typeof window !== undefined) window['tln'] = app
    if (onMount) onMount(app, null)
    if (onPersist) unsubs.push(app.subscribe('persist', onPersist))
    return () => {
      unsubs.forEach((unsub) => unsub())
      app.dispose()
    }
  }, [app, onMount, onPersist])
}
