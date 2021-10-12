import * as React from 'react'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ShapeIndicator } from '+components/shape-indicator'
import type { TLShape, TLUsers } from '+types'
import Utils from '+utils'
import { useTLContext } from '+hooks'

interface UserIndicatorProps<T extends TLShape> {
  userId: string
  users: TLUsers<T>
  meta: any
}

export function UsersIndicators<T extends TLShape>({ userId, users, meta }: UserIndicatorProps<T>) {
  const { shapeUtils } = useTLContext()

  return (
    <>
      {Object.values(users)
        .filter(Boolean)
        .filter((user) => user.id !== userId && user.selectedIds.length > 0)
        .map((user) => {
          const shapes = user.activeShapes //.map((id) => page.shapes[id])

          const bounds = Utils.getCommonBounds(
            shapes.map((shape) => shapeUtils[shape.type].getBounds(shape))
          )

          return (
            <React.Fragment key={user.id + '_shapes'}>
              <div
                className="tl-absolute tl-user-indicator-bounds"
                style={{
                  backgroundColor: user.color + '0d',
                  borderColor: user.color + '78',
                  transform: `translate(${bounds.minX}px, ${bounds.minY}px)`,
                  width: bounds.width,
                  height: bounds.height,
                  pointerEvents: 'none',
                }}
              />
              {shapes.map((shape) => (
                <ShapeIndicator
                  key={`${user.id}_${shape.id}_indicator`}
                  shape={shape}
                  color={user.color}
                  meta={meta}
                  isHovered
                />
              ))}
            </React.Fragment>
          )
        })}
    </>
  )
}
