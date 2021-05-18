import Command from "./command"
import history from "../history"
import { Data } from "types"
import { RotateSnapshot } from "state/sessions/rotate-session"

export default function translateCommand(
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
        const { shapes } = data.document.pages[after.currentPageId]

        for (let { id, point, rotation } of after.shapes) {
          const shape = shapes[id]
          shape.rotation = rotation
          shape.point = point
        }

        data.boundsRotation = after.boundsRotation
      },
      undo(data) {
        const { shapes } = data.document.pages[before.currentPageId]

        for (let { id, point, rotation } of before.shapes) {
          const shape = shapes[id]
          shape.rotation = rotation
          shape.point = point
        }

        data.boundsRotation = before.boundsRotation
      },
    })
  )
}
