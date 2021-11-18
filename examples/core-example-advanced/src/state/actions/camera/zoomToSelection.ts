import { Action, FIT_TO_SCREEN_PADDING } from 'state/constants'
import { Utils } from '@tldraw/core'
import { mutables } from 'state/mutables'
import { getShapeUtils } from 'shapes'
import { getZoomFitCamera } from 'state/helpers'
import Vec from '@tldraw/vec'

export const zoomToSelection: Action = (data) => {
  const { camera, selectedIds } = data.pageState
  const { viewport } = mutables

  if (selectedIds.length === 0) return

  const commonBounds = Utils.getCommonBounds(
    selectedIds
      .map((id) => data.page.shapes[id])
      .map((shape) => getShapeUtils(shape).getBounds(shape))
  )

  let zoom = Math.min(
    (viewport.width - FIT_TO_SCREEN_PADDING) / commonBounds.width,
    (viewport.height - FIT_TO_SCREEN_PADDING) / commonBounds.height
  )

  zoom = camera.zoom === zoom || camera.zoom < 1 ? Math.min(1, zoom) : zoom

  const delta = [
    (viewport.width - commonBounds.width * zoom) / 2 / zoom,
    (viewport.height - commonBounds.height * zoom) / 2 / zoom,
  ]

  camera.zoom = zoom
  camera.point = Vec.add([-commonBounds.minX, -commonBounds.minY], delta)
}
