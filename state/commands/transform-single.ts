import Command from "./command"
import history from "../history"
import { Data, TransformCorner, TransformEdge } from "types"
import { getShapeUtils } from "lib/shape-utils"
import { current } from "immer"
import { TransformSingleSnapshot } from "state/sessions/transform-single-session"

export default function transformSingleCommand(
  data: Data,
  before: TransformSingleSnapshot,
  after: TransformSingleSnapshot,
  scaleX: number,
  scaleY: number,
  isCreating: boolean
) {
  const shape =
    current(data).document.pages[after.currentPageId].shapes[after.id]

  history.execute(
    data,
    new Command({
      name: "transform_single_shape",
      category: "canvas",
      manualSelection: true,
      do(data) {
        const { id, currentPageId, type, initialShape, initialShapeBounds } =
          after

        data.selectedIds.clear()
        data.selectedIds.add(id)

        if (isCreating) {
          data.document.pages[currentPageId].shapes[id] = shape
        } else {
          getShapeUtils(shape).transformSingle(shape, initialShapeBounds, {
            type,
            initialShape,
            scaleX,
            scaleY,
          })
        }
      },
      undo(data) {
        const { id, currentPageId, type, initialShapeBounds } = before

        data.selectedIds.clear()

        if (isCreating) {
          delete data.document.pages[currentPageId].shapes[id]
        } else {
          const shape = data.document.pages[currentPageId].shapes[id]
          data.selectedIds.add(id)

          getShapeUtils(shape).transform(shape, initialShapeBounds, {
            type,
            initialShape: after.initialShape,
            scaleX: 1,
            scaleY: 1,
          })
        }
      },
    })
  )
}
