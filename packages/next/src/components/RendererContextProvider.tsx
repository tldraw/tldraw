/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { autorun } from 'mobx'
import { observer } from 'mobx-react-lite'
import { BoundsForeground, BoundsBackground } from '~components'
import { useStylesheet, nuContext, NuContext } from '~hooks'
import type { TLNuShape } from '~nu-lib'
import type { TLNuContextProviderProps } from '~types'
import { EMPTY_OBJECT } from '~constants'

export const RendererContextProvider = observer(function Renderer<S extends TLNuShape = TLNuShape>({
  children,
  components = EMPTY_OBJECT,
  id,
  inputs,
  meta,
  onKeyDown,
  onKeyUp,
  onPan,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onPointerMove,
  onPointerUp,
  theme = EMPTY_OBJECT,
  viewport,
}: TLNuContextProviderProps<S>): JSX.Element {
  useStylesheet(theme, id)

  const [currentContext, setCurrentContext] = React.useState<NuContext<S>>(() => {
    const { boundsBackground = BoundsBackground, boundsForeground = BoundsForeground } = components

    return {
      viewport,
      inputs,
      callbacks: {
        onPan,
        onPointerDown,
        onPointerUp,
        onPointerMove,
        onPointerEnter,
        onPointerLeave,
        onKeyDown,
        onKeyUp,
      },
      components: {
        boundsBackground,
        boundsForeground,
      },
      meta,
    }
  })

  React.useEffect(() => {
    const { boundsBackground = BoundsBackground, boundsForeground = BoundsForeground } = components

    autorun(() => {
      setCurrentContext({
        viewport,
        inputs,
        callbacks: {
          onPan,
          onPointerDown,
          onPointerUp,
          onPointerMove,
          onPointerEnter,
          onPointerLeave,
          onKeyDown,
          onKeyUp,
        },
        components: {
          boundsBackground,
          boundsForeground,
        },
        meta,
      })
    })
  }, [])

  return <nuContext.Provider value={currentContext}>{children}</nuContext.Provider>
})
