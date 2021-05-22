import Command from "./command"
import history from "../history"
import { Data, Shape } from "types"
import { getPage } from "utils/utils"

export default function registerShapeUtilsCommand(data: Data, shape: Shape) {
  const { currentPageId } = data

  history.execute(
    data,
    new Command({
      name: "translate_shapes",
      category: "canvas",
      do(data) {
        const page = getPage(data)

        page.shapes[shape.id] = shape
        data.selectedIds.clear()
        data.pointedId = undefined
        data.hoveredId = undefined
      },
      undo(data) {
        const page = getPage(data)

        delete page.shapes[shape.id]

        data.selectedIds.clear()
        data.pointedId = undefined
        data.hoveredId = undefined
      },
    })
  )
}
