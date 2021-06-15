import { getShapeUtils } from 'lib/shape-utils'
import { memo } from 'react'
import { useSelector } from 'state'
import { deepCompareArrays, getCurrentCamera, getPage } from 'utils/utils'
import { DotCircle, Handle } from './misc'

export default function Defs() {
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
  const shape = useSelector((s) => getPage(s.data).shapes[id])

  if (!shape) return null
  return getShapeUtils(shape).render(shape, { isEditing: false })
})
