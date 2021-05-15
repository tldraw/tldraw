import Command from "./command"
import history from "../history"
import { Data, Shape } from "types"
import { current } from "immer"

export default function setGeneratedShapes(
  data: Data,
  currentPageId: string,
  generatedShapes: Shape[]
) {
  const prevGeneratedShapes = Object.values(
    current(data).document.pages[currentPageId].shapes
  ).filter((shape) => shape.isGenerated)

  for (let shape of generatedShapes) {
    data.document.pages[currentPageId].shapes[shape.id] = shape
  }

  history.execute(
    data,
    new Command({
      name: "translate_shapes",
      category: "canvas",
      do(data) {
        const { shapes } = data.document.pages[currentPageId]

        data.selectedIds.clear()

        // Remove previous generated shapes
        for (let id in shapes) {
          if (shapes[id].isGenerated) {
            delete shapes[id]
          }
        }

        // Add new generated shapes
        for (let shape of generatedShapes) {
          shapes[shape.id] = shape
        }
      },
      undo(data) {
        const { shapes } = data.document.pages[currentPageId]

        // Remove generated shapes
        for (let id in shapes) {
          if (shapes[id].isGenerated) {
            delete shapes[id]
          }
        }

        // Restore previous generated shapes
        for (let shape of prevGeneratedShapes) {
          shapes[shape.id] = shape
        }
      },
    })
  )
}
