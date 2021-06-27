import { useSelector } from 'state'
import { getShapeUtils } from 'state/shape-utils'
import { PageState, Bounds } from 'types'
import {
  boundsCollide,
  boundsContain,
  deepCompareArrays,
  getPage,
  getViewport,
} from 'utils'

const viewportCache = new WeakMap<PageState, Bounds>()

export default function usePageShapes(): string[] {
  return useSelector((s) => {
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
}
