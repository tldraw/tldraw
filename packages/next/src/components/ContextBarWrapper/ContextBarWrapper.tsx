import Vec from '@tldraw/vec'
import { observer } from 'mobx-react-lite'
import * as React from 'react'
import { Container } from '~components'
import { useContext } from '~hooks'
import type { TLNuShape } from '~nu-lib'
import type { TLNuBounds } from '~types'
import { BoundsUtils } from '~utils'

function multiplyBounds(bounds: TLNuBounds, n: number) {
  const center = BoundsUtils.getBoundsCenter(bounds)
  return BoundsUtils.centerBounds(
    {
      minX: bounds.minX * n,
      minY: bounds.minY * n,
      maxX: bounds.maxX * n,
      maxY: bounds.maxY * n,
      width: bounds.width * n,
      height: bounds.height * n,
    },
    center
  )
}

export interface TLNuContextBarProps<S extends TLNuShape> {
  shapes: S[]
  bounds: TLNuBounds
}

export const ContextBarWrapper = observer(function ContextBar<S extends TLNuShape>({
  shapes,
  bounds,
}: TLNuContextBarProps<S>) {
  const {
    components: { ContextBar },
    viewport: {
      camera: { zoom },
    },
  } = useContext()

  if (!ContextBar) return null

  return (
    <Container bounds={bounds} zIndex={10003} counterScaled>
      <div className="nu-context-bar">
        <ContextBar shapes={shapes} bounds={multiplyBounds(bounds, zoom)} />
      </div>
    </Container>
  )
})
