import { getShapeUtils } from 'state/shape-utils'
import { useSelector } from 'state'
import { Bounds, PageState } from 'types'
import {
  deepCompareArrays,
  getPage,
  getViewport,
  boundsCollide,
  boundsContain,
} from 'utils'
import Shape from './shape'

/* 
On each state change, compare node ids of all shapes
on the current page. Kind of expensive but only happens
here; and still cheaper than any other pattern I've found.
*/

const noOffset = [0, 0]

const viewportCache = new WeakMap<PageState, Bounds>()

export default function Page(): JSX.Element {
  const currentPageShapeIds = useSelector((s) => {
    const page = getPage(s.data)
    const pageState = s.data.pageStates[page.id]

    if (!viewportCache.has(pageState)) {
      const viewport = getViewport(s.data)
      viewportCache.set(pageState, viewport)
    }

    const viewport = viewportCache.get(pageState)

    return s.values.currentShapes
      .filter((shape) => {
        const shapeBounds = getShapeUtils(shape).getBounds(shape)
        return (
          boundsContain(viewport, shapeBounds) ||
          boundsCollide(viewport, shapeBounds)
        )
      })
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
