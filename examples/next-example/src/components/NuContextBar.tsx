import * as React from 'react'
import { BoundsUtils, HTMLContainer, TLNuContextBarComponent } from '@tldraw/next'
import { observer } from 'mobx-react-lite'
import { useAppContext } from 'context'
import type { Shape } from 'stores'

const _NuContextBar: TLNuContextBarComponent<Shape> = ({ shapes, scaledBounds, rotation }) => {
  const rotatedBounds = BoundsUtils.getRotatedBounds(scaledBounds, rotation)

  const app = useAppContext()

  const updateStroke = React.useCallback<React.ChangeEventHandler<HTMLInputElement>>((e) => {
    shapes.forEach((shape) => shape.update({ stroke: e.currentTarget.value }))
  }, [])

  const updateFill = React.useCallback<React.ChangeEventHandler<HTMLInputElement>>((e) => {
    shapes.forEach((shape) => shape.update({ fill: e.currentTarget.value }))
  }, [])

  const updateStrokeWidth = React.useCallback<React.ChangeEventHandler<HTMLInputElement>>((e) => {
    shapes.forEach((shape) => shape.update({ strokeWidth: +e.currentTarget.value }))
  }, [])

  if (!app) return null

  return (
    <HTMLContainer centered>
      <div
        className="contextbar"
        style={{
          top: -(rotatedBounds.height / 2 + 52),
          pointerEvents: 'all',
          position: 'relative',
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
        <input type="color" onChange={updateStroke} />
        Fill
        <input type="color" onChange={updateFill} />
        Width
        <input
          type="number"
          value={Math.max(...shapes.map((shape) => shape.strokeWidth))}
          onChange={updateStrokeWidth}
          style={{ width: 48 }}
        />
      </div>
    </HTMLContainer>
  )
}

export const NuContextBar = observer(_NuContextBar)
