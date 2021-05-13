import Command from "./command"
import history from "../history"
import { TranslateSnapshot } from "state/sessions/translate-session"
import { Data } from "types"

export default function translateCommand(
  data: Data,
  before: TranslateSnapshot,
  after: TranslateSnapshot
) {
  history.execute(
    data,
    new Command({
      name: "translate_shapes",
      category: "canvas",
      do(data) {
        const { shapes } = data.document.pages[after.currentPageId]

        for (let { id, point } of after.shapes) {
          shapes[id].point = point
        }
      },
      undo(data) {
        const { shapes } = data.document.pages[before.currentPageId]

        for (let { id, point } of before.shapes) {
          shapes[id].point = point
        }
      },
    })
  )
}
