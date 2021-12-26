import * as React from 'react'
import { getShapeStyle } from '~state/shapes/shared'
import type { ShapeStyles } from '~types'
import { getRectangleIndicatorPathTDSnapshot, getRectanglePath } from '../helpers'

interface RectangleSvgProps {
  id: string
  style: ShapeStyles
  isSelected: boolean
  size: number[]
}

export const DrawRectangle = React.memo(function DrawRectangle({
  id,
  style,
  size,
  isSelected,
}: RectangleSvgProps) {
  const { isFilled } = style
  const { stroke, strokeWidth, fill } = getShapeStyle(style)
  const pathTDSnapshot = getRectanglePath(id, style, size)
  const innerPath = getRectangleIndicatorPathTDSnapshot(id, style, size)

  return (
    <>
      <path
        className={style.isFilled || isSelected ? 'tl-fill-hitarea' : 'tl-stroke-hitarea'}
        d={innerPath}
      />
      <path d={innerPath} fill={isFilled ? fill : 'none'} pointerEvents="none" />
      <path
        d={pathTDSnapshot}
        fill={stroke}
        stroke={stroke}
        strokeWidth={strokeWidth}
        pointerEvents="none"
      />
    </>
  )
})
