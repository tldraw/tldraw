import Command from "./command"
import history from "../history"
import { Data, Shape } from "types"

export default function registerShapeUtilsCommand(data: Data, shape: Shape) {
  const { currentPageId } = data

  history.execute(
    data,
    new Command({
      name: "translate_shapes",
      category: "canvas",
      do(data) {
        const { shapes } = data.document.pages[currentPageId]

        shapes[shape.id] = shape
        data.selectedIds.clear()
        data.pointedId = undefined
        data.hoveredId = undefined
      },
      undo(data) {
        const { shapes } = data.document.pages[currentPageId]

        delete shapes[shape.id]

        data.selectedIds.clear()
        data.pointedId = undefined
        data.hoveredId = undefined
      },
    })
  )
}
