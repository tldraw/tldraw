import { observer } from 'mobx-react-lite'
import * as React from 'react'
import { usePosition, useTLContext } from '~hooks'
import type { TLShape, TLUser } from '~types'

interface IndicatorProps<T extends TLShape, M = unknown> {
  shape: T
  meta: M extends unknown ? M : undefined
  isSelected?: boolean
  isHovered?: boolean
  isEditing?: boolean
  user?: TLUser<T>
}

export const ShapeIndicator = observer(function ShapeIndicator<T extends TLShape, M>({
  isHovered = false,
  isSelected = false,
  isEditing = false,
  shape,
  user,
  meta,
}: IndicatorProps<T, M>) {
  const { shapeUtils } = useTLContext()
  const utils = shapeUtils[shape.type]
  const bounds = utils.getBounds(shape)
  const rPositioned = usePosition(bounds, shape.rotation)

  return (
    <div
      ref={rPositioned}
      draggable={false}
      className={[
        'tl-indicator',
        'tl-absolute',
        isSelected && !user ? 'tl-selected' : 'tl-hovered',
        isEditing ? 'tl-editing' : '',
        shape.isLocked ? 'tl-locked' : '',
      ].join(' ')}
    >
      <svg width="100%" height="100%">
        <g className="tl-centered-g" stroke={user?.color}>
          <utils.Indicator
            shape={shape}
            meta={meta}
            user={user}
            bounds={bounds}
            isSelected={isSelected}
            isHovered={isHovered}
          />
        </g>
      </svg>
    </div>
  )
})
