import { getShapeStyle } from 'state/shape-styles'
import { getShapeUtils } from 'state/shape-utils'
import React, { memo } from 'react'
import { useSelector } from 'state'
import { deepCompareArrays, getCurrentCamera, getPage } from 'utils'
import { DotCircle, Handle } from './misc'
import useShapeDef from 'hooks/useShape'

export default function Defs(): JSX.Element {
  const zoom = useSelector((s) => getCurrentCamera(s.data).zoom)

  const currentPageShapeIds = useSelector(({ data }) => {
    return Object.values(getPage(data).shapes)
      .filter(Boolean)
      .filter((shape) => !getShapeUtils(shape).isForeignObject)
      .sort((a, b) => a.childIndex - b.childIndex)
      .map((shape) => shape.id)
  }, deepCompareArrays)

  return (
    <defs>
      {currentPageShapeIds.map((id) => (
        <Def key={id} id={id} />
      ))}
      <DotCircle id="dot" r={4} />
      <Handle id="handle" r={4} />
      <filter id="expand">
        <feMorphology operator="dilate" radius={2 / zoom} />
      </filter>
    </defs>
  )
}

const Def = memo(function Def({ id }: { id: string }) {
  const shape = useShapeDef(id)

  if (!shape) return null

  const style = getShapeStyle(shape.style)

  return React.cloneElement(
    getShapeUtils(shape).render(shape, { isEditing: false }),
    { id, ...style }
  )
})
