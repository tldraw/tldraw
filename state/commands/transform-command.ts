import Command from "./command"
import history from "../history"
import { Data } from "types"
import { TransformSnapshot } from "state/sessions/transform-session"
import { getShapeUtils } from "lib/shapes"

export default function translateCommand(
  data: Data,
  before: TransformSnapshot,
  after: TransformSnapshot
) {
  history.execute(
    data,
    new Command({
      name: "translate_shapes",
      category: "canvas",
      do(data) {
        const { shapeBounds, initialBounds, currentPageId, selectedIds } = after
        const { shapes } = data.document.pages[currentPageId]

        selectedIds.forEach((id) => {
          const { initialShape, initialShapeBounds } = shapeBounds[id]
          const shape = shapes[id]

          getShapeUtils(shape).transform(
            shape,
            {
              ...initialShapeBounds,
              isFlippedX: false,
              isFlippedY: false,
            },
            initialShape,
            initialShapeBounds,
            initialBounds
          )
        })
      },
      undo(data) {
        const {
          shapeBounds,
          initialBounds,
          currentPageId,
          selectedIds,
        } = before

        const { shapes } = data.document.pages[currentPageId]

        selectedIds.forEach((id) => {
          const { initialShape, initialShapeBounds } = shapeBounds[id]
          const shape = shapes[id]

          getShapeUtils(shape).transform(
            shape,
            {
              ...initialShapeBounds,
              isFlippedX: false,
              isFlippedY: false,
            },
            initialShape,
            initialShapeBounds,
            initialBounds
          )
        })
      },
    })
  )
}
