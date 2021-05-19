import Command from "./command"
import history from "../history"
import { Data, TransformCorner, TransformEdge } from "types"
import { getShapeUtils } from "lib/shapes"
import { TransformSingleSnapshot } from "state/sessions/transform-single-session"

export default function transformSingleCommand(
  data: Data,
  before: TransformSingleSnapshot,
  after: TransformSingleSnapshot,
  anchor: TransformCorner | TransformEdge
) {
  history.execute(
    data,
    new Command({
      name: "translate_shapes",
      category: "canvas",
      do(data) {
        const {
          type,
          initialShape,
          initialShapeBounds,
          currentPageId,
          id,
          boundsRotation,
        } = after

        const { shapes } = data.document.pages[currentPageId]

        const shape = shapes[id]

        getShapeUtils(shape).transform(shape, initialShapeBounds, {
          type,
          initialShape,
          initialShapeBounds,
          initialBounds: initialShapeBounds,
          boundsRotation,
          isFlippedX: false,
          isFlippedY: false,
          isSingle: false,
          anchor,
        })
      },
      undo(data) {
        const {
          type,
          initialShape,
          initialShapeBounds,
          currentPageId,
          id,
          boundsRotation,
        } = before

        const { shapes } = data.document.pages[currentPageId]

        const shape = shapes[id]

        getShapeUtils(shape).transform(shape, initialShapeBounds, {
          type,
          initialShape,
          initialShapeBounds,
          initialBounds: initialShapeBounds,
          boundsRotation,
          isFlippedX: false,
          isFlippedY: false,
          isSingle: false,
          anchor,
        })
      },
    })
  )
}
