import * as React from 'react'
import { ShapeIndicator } from '~components/ShapeIndicator'
import { useTLContext } from '~hooks'
import type { TLPage, TLShape, TLUsers } from '~types'
import Utils from '~utils'

interface UserIndicatorProps<T extends TLShape> {
  page: TLPage<any, any>
  userId: string
  users: TLUsers<T>
  meta: any
}

export function UsersIndicators<T extends TLShape>({
  userId,
  users,
  meta,
  page,
}: UserIndicatorProps<T>) {
  const { shapeUtils } = useTLContext()

  return (
    <>
      {Object.values(users)
        .filter(Boolean)
        .filter((user) => user.id !== userId && user.selectedIds.length > 0)
        .map((user) => {
          const shapes = user.selectedIds.map((id) => page.shapes[id]).filter(Boolean)

          if (shapes.length === 0) return null

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
                  user={user}
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
