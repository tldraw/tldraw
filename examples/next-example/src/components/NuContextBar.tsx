import * as React from 'react'
import { BoundsUtils, HTMLContainer, TLNuContextBarComponent } from '@tldraw/next'
import { observer } from 'mobx-react-lite'
import { useAppContext } from 'context'
import type { NuPolygonShape, Shape } from 'stores'

const _NuContextBar: TLNuContextBarComponent<Shape> = ({
  shapes,
  offset,
  scaledBounds,
  rotation,
}) => {
  const rContextBar = React.useRef<HTMLDivElement>(null)

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

  const updateSides = React.useCallback<React.ChangeEventHandler<HTMLInputElement>>((e) => {
    shapes.forEach((shape) => shape.update({ sides: +e.currentTarget.value }))
  }, [])

  React.useLayoutEffect(() => {
    const elm = rContextBar.current
    if (!elm) return

    let x = 0
    let y = 0

    const { offsetWidth } = elm

    if (offset.top > 116) {
      y = -(rotatedBounds.height / 2 + 52)
    } else {
      y = rotatedBounds.height / 2 + 64
    }

    if (offset.left + scaledBounds.width / 2 - offsetWidth / 2 < 16) {
      x += -(offset.left + scaledBounds.width / 2 - offsetWidth / 2 - 16)
    } else if (offset.right + scaledBounds.width / 2 - offsetWidth / 2 < 16) {
      x += offset.right + scaledBounds.width / 2 - offsetWidth / 2 - 16
    }

    elm.style.setProperty('opacity', `1`)
    elm.style.setProperty('transform', `translateX(${x}px) translateY(${y}px)`)
  }, [rotatedBounds, offset])

  if (!app) return null

  const polygonShapes = shapes.filter((shape) => shape.type === 'polygon') as NuPolygonShape[]

  return (
    <HTMLContainer centered>
      <div
        ref={rContextBar}
        className="contextbar"
        style={{
          pointerEvents: 'all',
          position: 'relative',
          backgroundColor: 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          whiteSpace: 'nowrap',
          display: 'flex',
          gap: 8,
          opacity: 0,
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
        {polygonShapes.length > 0 && (
          <>
            Sides
            <input
              type="number"
              value={Math.max(...polygonShapes.map((shape) => shape.sides))}
              onChange={updateSides}
              style={{ width: 48 }}
            />
          </>
        )}
      </div>
    </HTMLContainer>
  )
}

export const NuContextBar = observer(_NuContextBar)
