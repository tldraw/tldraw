import { getShapeUtils } from 'lib/shape-utils'
import { memo } from 'react'
import { useSelector } from 'state'
import { deepCompareArrays, getCurrentCamera, getPage } from 'utils/utils'

export default function Defs() {
  const zoom = useSelector((s) => getCurrentCamera(s.data).zoom)

  const currentPageShapeIds = useSelector(({ data }) => {
    return Object.values(getPage(data).shapes)
      .sort((a, b) => a.childIndex - b.childIndex)
      .map((shape) => shape.id)
  }, deepCompareArrays)

  return (
    <defs>
      {currentPageShapeIds.map((id) => (
        <Def key={id} id={id} />
      ))}
      <filter id="expand">
        <feMorphology operator="dilate" radius={2 / zoom} />
      </filter>
    </defs>
  )
}

const Def = memo(function Def({ id }: { id: string }) {
  const shape = useSelector(({ data }) => getPage(data).shapes[id])
  if (!shape) return null
  return getShapeUtils(shape).render(shape)
})
