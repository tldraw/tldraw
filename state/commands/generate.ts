import Command from "./command"
import history from "../history"
import { CodeControl, Data, Shape } from "types"
import { current } from "immer"
import { getPage } from "utils/utils"

export default function generateCommand(
  data: Data,
  currentPageId: string,
  generatedShapes: Shape[]
) {
  const cData = current(data)
  const page = getPage(cData)

  const currentShapes = page.shapes

  const prevGeneratedShapes = Object.values(currentShapes).filter(
    (shape) => shape.isGenerated
  )

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
        const { shapes } = getPage(data)

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
        const { shapes } = getPage(data)

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
