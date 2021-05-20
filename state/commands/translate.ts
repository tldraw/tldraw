import Command from "./command"
import history from "../history"
import { TranslateSnapshot } from "state/sessions/translate-session"
import { Data } from "types"

export default function translateCommand(
  data: Data,
  before: TranslateSnapshot,
  after: TranslateSnapshot,
  isCloning: boolean
) {
  history.execute(
    data,
    new Command({
      name: isCloning ? "clone_shapes" : "translate_shapes",
      category: "canvas",
      manualSelection: true,
      do(data, initial) {
        if (initial) return

        const { shapes } = data.document.pages[after.currentPageId]
        const { initialShapes } = after
        const { clones } = before // !

        data.selectedIds.clear()

        if (isCloning) {
          for (const clone of clones) {
            shapes[clone.id] = clone
          }
        }

        for (const { id, point } of initialShapes) {
          shapes[id].point = point
          data.selectedIds.add(id)
        }
      },
      undo(data) {
        const { shapes } = data.document.pages[before.currentPageId]
        const { initialShapes, clones } = before

        data.selectedIds.clear()

        if (isCloning) {
          for (const { id } of clones) {
            delete shapes[id]
          }
        }

        for (const { id, point } of initialShapes) {
          shapes[id].point = point
          data.selectedIds.add(id)
        }
      },
    })
  )
}
