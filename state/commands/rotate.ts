import Command from "./command"
import history from "../history"
import { Data } from "types"
import { RotateSnapshot } from "state/sessions/rotate-session"
import { getPage } from "utils/utils"
import { getShapeUtils } from "lib/shape-utils"

export default function rotateCommand(
  data: Data,
  before: RotateSnapshot,
  after: RotateSnapshot
) {
  history.execute(
    data,
    new Command({
      name: "translate_shapes",
      category: "canvas",
      do(data) {
        const { shapes } = getPage(data)

        for (let { id, point, rotation } of after.shapes) {
          const shape = shapes[id]
          const utils = getShapeUtils(shape)
          utils.rotateTo(shape, rotation).translateTo(shape, point)
        }

        data.boundsRotation = after.boundsRotation
      },
      undo(data) {
        const { shapes } = getPage(data, before.currentPageId)

        for (let { id, point, rotation } of before.shapes) {
          const shape = shapes[id]
          const utils = getShapeUtils(shape)
          utils.rotateTo(shape, rotation).translateTo(shape, point)
        }

        data.boundsRotation = before.boundsRotation
      },
    })
  )
}
