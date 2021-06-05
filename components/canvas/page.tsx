import { useSelector } from 'state'
import { GroupShape } from 'types'
import { deepCompareArrays, getPage } from 'utils/utils'
import Shape from './shape'

/* 
On each state change, compare node ids of all shapes
on the current page. Kind of expensive but only happens
here; and still cheaper than any other pattern I've found.
*/

const noOffset = [0, 0]

export default function Page() {
  const currentPageShapeIds = useSelector(({ data }) => {
    return Object.values(getPage(data).shapes)
      .filter((shape) => shape.parentId === data.currentPageId)
      .sort((a, b) => a.childIndex - b.childIndex)
      .map((shape) => shape.id)
  }, deepCompareArrays)

  const isSelecting = useSelector((s) => s.isIn('selecting'))

  return (
    <g pointerEvents={isSelecting ? 'all' : 'none'}>
      {currentPageShapeIds.map((shapeId) => (
        <Shape
          key={shapeId}
          id={shapeId}
          isSelecting={isSelecting}
          parentPoint={noOffset}
        />
      ))}
    </g>
  )
}
