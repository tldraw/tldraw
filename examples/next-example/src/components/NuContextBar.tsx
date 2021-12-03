import * as React from 'react'
import { BoundsUtils, HTMLContainer, TLNuContextBarComponent } from '@tldraw/next'
import { observer } from 'mobx-react-lite'

const _NuContextBar: TLNuContextBarComponent = ({ scaledBounds, rotation }) => {
  const rotatedBounds = BoundsUtils.getRotatedBounds(scaledBounds, rotation)

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
        context bar
      </div>
    </HTMLContainer>
  )
}

export const NuContextBar: TLNuContextBarComponent = observer(_NuContextBar)
