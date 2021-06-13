import { getShapeUtils } from 'lib/shape-utils'
import state, { useSelector } from 'state'
import { Bounds, GroupShape, PageState } from 'types'
import { boundsCollide, boundsContain } from 'utils/bounds'
import { deepCompareArrays, getPage, screenToWorld } from 'utils/utils'
import Shape from './shape'

/* 
On each state change, compare node ids of all shapes
on the current page. Kind of expensive but only happens
here; and still cheaper than any other pattern I've found.
*/

const noOffset = [0, 0]

const viewportCache = new WeakMap<PageState, Bounds>()

export default function Page() {
  const currentPageShapeIds = useSelector((s) => {
    const page = getPage(s.data)
    const pageState = s.data.pageStates[page.id]

    if (!viewportCache.has(pageState)) {
      const [minX, minY] = screenToWorld([0, 0], s.data)
      const [maxX, maxY] = screenToWorld(
        [window.innerWidth, window.innerHeight],
        s.data
      )
      viewportCache.set(pageState, {
        minX,
        minY,
        maxX,
        maxY,
        height: maxX - minX,
        width: maxY - minY,
      })
    }

    const viewport = viewportCache.get(pageState)

    return Object.values(page.shapes)
      .filter((shape) => shape.parentId === page.id)
      .filter((shape) => {
        const shapeBounds = getShapeUtils(shape).getBounds(shape)
        return (
          boundsContain(viewport, shapeBounds) ||
          boundsCollide(viewport, shapeBounds)
        )
      })
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
