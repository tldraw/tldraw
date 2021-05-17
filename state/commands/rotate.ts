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

        for (let { id, rotation } of after.shapes) {
          shapes[id].rotation = rotation
        }
      },
      undo(data) {
        const { shapes } = data.document.pages[before.currentPageId]

        for (let { id, rotation } of before.shapes) {
          shapes[id].rotation = rotation
        }
      },
    })
  )
}
