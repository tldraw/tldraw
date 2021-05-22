import Command from "./command"
import history from "../history"
import { Data, Corner, Edge } from "types"
import { TransformSnapshot } from "state/sessions/transform-session"
import { getShapeUtils } from "lib/shape-utils"
import { getPage } from "utils/utils"

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
        const { type, selectedIds } = after

        const { shapes } = getPage(data)

        selectedIds.forEach((id) => {
          const { initialShape, initialShapeBounds, transformOrigin } =
            after.shapeBounds[id]
          const shape = shapes[id]

          getShapeUtils(shape).transform(shape, initialShapeBounds, {
            type,
            initialShape,
            scaleX: 1,
            scaleY: 1,
            transformOrigin,
          })
        })
      },
      undo(data) {
        const { type, selectedIds } = before

        const { shapes } = getPage(data)

        selectedIds.forEach((id) => {
          const { initialShape, initialShapeBounds, transformOrigin } =
            before.shapeBounds[id]
          const shape = shapes[id]

          getShapeUtils(shape).transform(shape, initialShapeBounds, {
            type,
            initialShape,
            scaleX: 1,
            scaleY: 1,
            transformOrigin,
          })
        })
      },
    })
  )
}
