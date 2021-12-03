import * as React from 'react'
import { BoundsUtils, HTMLContainer, TLNuContextBarComponent } from '@tldraw/next'
import { observer } from 'mobx-react-lite'
import { useAppContext } from 'context'
import type { Shape } from 'stores'

const _NuContextBar: TLNuContextBarComponent<Shape> = ({ scaledBounds, rotation }) => {
  const rotatedBounds = BoundsUtils.getRotatedBounds(scaledBounds, rotation)

  const app = useAppContext()

  if (!app) return null

  return (
    <HTMLContainer centered>
      <div
        style={{
          pointerEvents: 'all',
          position: 'relative',
          top: -(rotatedBounds.height / 2 + 48),
          backgroundColor: 'white',
          border: '1px solid black',
          padding: '8px 12px',
          borderRadius: '24px',
          whiteSpace: 'nowrap',
        }}
      >
        <button onClick={() => app.selectAll()}>Select All </button>
      </div>
    </HTMLContainer>
  )
}

export const NuContextBar = observer(_NuContextBar)
