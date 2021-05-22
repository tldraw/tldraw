import Command from "./command"
import history from "../history"
import { Data, Corner, Edge } from "types"
import { getShapeUtils } from "lib/shape-utils"
import { current } from "immer"
import { TransformSingleSnapshot } from "state/sessions/transform-single-session"
import { getPage } from "utils/utils"

export default function transformSingleCommand(
  data: Data,
  before: TransformSingleSnapshot,
  after: TransformSingleSnapshot,
  scaleX: number,
  scaleY: number,
  isCreating: boolean
) {
  const shape = getPage(data, after.currentPageId).shapes[after.id]

  history.execute(
    data,
    new Command({
      name: "transform_single_shape",
      category: "canvas",
      manualSelection: true,
      do(data) {
        const { id, type, initialShape, initialShapeBounds } = after

        const { shapes } = getPage(data, after.currentPageId)

        data.selectedIds.clear()
        data.selectedIds.add(id)

        if (isCreating) {
          shapes[id] = shape
        } else {
          getShapeUtils(shape).transformSingle(shape, initialShapeBounds, {
            type,
            initialShape,
            scaleX,
            scaleY,
            transformOrigin: [0.5, 0.5],
          })
        }
      },
      undo(data) {
        const { id, type, initialShapeBounds } = before

        const { shapes } = getPage(data, before.currentPageId)

        data.selectedIds.clear()

        if (isCreating) {
          delete shapes[id]
        } else {
          const shape = shapes[id]
          data.selectedIds.add(id)

          getShapeUtils(shape).transform(shape, initialShapeBounds, {
            type,
            initialShape: after.initialShape,
            scaleX: 1,
            scaleY: 1,
            transformOrigin: [0.5, 0.5],
          })
        }
      },
    })
  )
}
