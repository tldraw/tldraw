import * as React from 'react'
import { BoundsUtils, HTMLContainer, TLNuContextBarComponent } from '@tldraw/next'
import { observer } from 'mobx-react-lite'
import { useAppContext } from 'context'
import type { Shape } from 'stores'

const _NuContextBar: TLNuContextBarComponent<Shape> = ({ shapes, scaledBounds, rotation }) => {
  const rotatedBounds = BoundsUtils.getRotatedBounds(scaledBounds, rotation)

  const app = useAppContext()

  if (!app) return null

  return (
    <HTMLContainer centered>
      <div
        style={{
          pointerEvents: 'all',
          position: 'relative',
          top: -(rotatedBounds.height / 2 + 52),
          backgroundColor: 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          whiteSpace: 'nowrap',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          fontSize: 14,
          boxShadow: 'var(--nu-shadow-elevation-medium)',
        }}
      >
        Stroke
        <input
          type="color"
          onChange={(e) => {
            shapes.forEach((shape) => shape.update({ stroke: e.currentTarget.value }))
          }}
        />
        Fill
        <input
          type="color"
          onChange={(e) => {
            shapes.forEach((shape) => shape.update({ fill: e.currentTarget.value }))
          }}
        />
        Width
        <input
          type="number"
          value={Math.max(...shapes.map((shape) => shape.strokeWidth))}
          onChange={(e) => {
            shapes.forEach((shape) => shape.update({ strokeWidth: +e.currentTarget.value }))
          }}
          style={{ width: 48 }}
        />
      </div>
    </HTMLContainer>
  )
}

export const NuContextBar = observer(_NuContextBar)
