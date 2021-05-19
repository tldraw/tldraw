import Command from "./command"
import history from "../history"
import { Data, TransformCorner, TransformEdge } from "types"
import { TransformSnapshot } from "state/sessions/transform-session"
import { getShapeUtils } from "lib/shapes"

export default function transformCommand(
  data: Data,
  before: TransformSnapshot,
  after: TransformSnapshot,
  scaleX: number,
  scaleY: number
) {
  history.execute(
    data,
    new Command({
      name: "translate_shapes",
      category: "canvas",
      do(data) {
        const { type, currentPageId, selectedIds } = after

        selectedIds.forEach((id) => {
          const { initialShape, initialShapeBounds } = after.shapeBounds[id]
          const shape = data.document.pages[currentPageId].shapes[id]

          getShapeUtils(shape).transform(shape, initialShapeBounds, {
            type,
            initialShape,
            scaleX: 1,
            scaleY: 1,
          })
        })
      },
      undo(data) {
        const { type, currentPageId, selectedIds } = before

        selectedIds.forEach((id) => {
          const { initialShape, initialShapeBounds } = before.shapeBounds[id]
          const shape = data.document.pages[currentPageId].shapes[id]

          getShapeUtils(shape).transform(shape, initialShapeBounds, {
            type,
            initialShape,
            scaleX: 1,
            scaleY: 1,
          })
        })
      },
    })
  )
}
