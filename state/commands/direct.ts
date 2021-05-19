import Command from "./command"
import history from "../history"
import { DirectionSnapshot } from "state/sessions/direction-session"
import { Data, LineShape, RayShape } from "types"

export default function directCommand(
  data: Data,
  before: DirectionSnapshot,
  after: DirectionSnapshot
) {
  history.execute(
    data,
    new Command({
      name: "set_direction",
      category: "canvas",
      do(data) {
        const { shapes } = data.document.pages[after.currentPageId]

        for (let { id, direction } of after.shapes) {
          const shape = shapes[id] as RayShape | LineShape

          shape.direction = direction
        }
      },
      undo(data) {
        const { shapes } = data.document.pages[before.currentPageId]

        for (let { id, direction } of after.shapes) {
          const shape = shapes[id] as RayShape | LineShape

          shape.direction = direction
        }
      },
    })
  )
}
