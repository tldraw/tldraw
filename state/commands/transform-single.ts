import Command from "./command"
import history from "../history"
import { Data, TransformCorner, TransformEdge } from "types"
import { getShapeUtils } from "lib/shapes"
import { TransformSingleSnapshot } from "state/sessions/transform-single-session"

export default function transformSingleCommand(
  data: Data,
  before: TransformSingleSnapshot,
  after: TransformSingleSnapshot,
  scaleX: number,
  scaleY: number
) {
  history.execute(
    data,
    new Command({
      name: "transform_single_shape",
      category: "canvas",
      do(data) {
        const { id, currentPageId, type, initialShape, initialShapeBounds } =
          after

        const shape = data.document.pages[currentPageId].shapes[id]

        getShapeUtils(shape).transformSingle(shape, initialShapeBounds, {
          type,
          initialShape,
          scaleX,
          scaleY,
        })
      },
      undo(data) {
        const { id, currentPageId, type, initialShape, initialShapeBounds } =
          before

        const shape = data.document.pages[currentPageId].shapes[id]

        getShapeUtils(shape).transform(shape, initialShapeBounds, {
          type,
          initialShape: after.initialShape,
          scaleX: 1,
          scaleY: 1,
        })
      },
    })
  )
}
