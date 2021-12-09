import * as React from 'react'
import {
  BoundsBackground as _BoundsBackground,
  BoundsForeground as _BoundsForeground,
  BoundsDetail as _BoundsDetail,
} from '~components'
import type { TLNuCallbacks } from '~types'
import type { TLNuViewport, TLNuInputs, TLNuShape } from '~nu-lib'
import { EMPTY_OBJECT } from '~constants'
import { autorun } from 'mobx'
import type { NuContext } from '~hooks'

export function useContextState<S extends TLNuShape>(
  viewport: TLNuViewport,
  inputs: TLNuInputs,
  events: Partial<TLNuCallbacks<S>>,
  components = EMPTY_OBJECT,
  meta: any
) {
  const [currentContext, setCurrentContext] = React.useState<NuContext<S>>(() => {
    const { ContextBar, BoundsBackground, BoundsForeground, BoundsDetail } = components

    return {
      viewport,
      inputs,
      callbacks: events,
      meta,
      components: {
        BoundsBackground: BoundsBackground === null ? undefined : _BoundsBackground,
        BoundsForeground: BoundsForeground === null ? undefined : _BoundsForeground,
        BoundsDetail: BoundsDetail === null ? undefined : _BoundsDetail,
        ContextBar,
      },
    }
  })

  React.useEffect(() => {
    const { ContextBar, BoundsBackground, BoundsForeground, BoundsDetail } = components

    autorun(() => {
      setCurrentContext({
        viewport,
        inputs,
        callbacks: events,
        meta,
        components: {
          BoundsBackground: BoundsBackground === null ? undefined : _BoundsBackground,
          BoundsForeground: BoundsForeground === null ? undefined : _BoundsForeground,
          BoundsDetail: BoundsDetail === null ? undefined : _BoundsDetail,
          ContextBar,
        },
      })
    })
  }, [])

  return currentContext
}
