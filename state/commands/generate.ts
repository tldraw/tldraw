import Command from "./command"
import history from "../history"
import { CodeControl, Data, Shape } from "types"
import { current } from "immer"

export default function generateCommand(
  data: Data,
  currentPageId: string,
  generatedShapes: Shape[]
) {
  const cData = current(data)

  const prevGeneratedShapes = Object.values(
    cData.document.pages[currentPageId].shapes
  ).filter((shape) => shape.isGenerated)

  const currentShapes = data.document.pages[currentPageId].shapes

  // Remove previous generated shapes
  for (let id in currentShapes) {
    if (currentShapes[id].isGenerated) {
      delete currentShapes[id]
    }
  }

  // Add new ones
  for (let shape of generatedShapes) {
    currentShapes[shape.id] = shape
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
