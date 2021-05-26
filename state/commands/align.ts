import Command from "./command"
import history from "../history"
import { AlignType, Data } from "types"
import { getPage } from "utils/utils"
import { getShapeUtils } from "lib/shape-utils"

export default function alignCommand(data: Data, type: AlignType) {
  const { currentPageId } = data
  const initialPoints = Object.fromEntries(
    Object.entries(getPage(data).shapes).map(([id, shape]) => [
      id,
      [...shape.point],
    ])
  )

  history.execute(
    data,
    new Command({
      name: "aligned",
      category: "canvas",
      do(data) {
        const { shapes } = getPage(data, currentPageId)

        switch (type) {
          case AlignType.Top: {
            break
          }
          case AlignType.CenterVertical: {
            break
          }
          case AlignType.Bottom: {
            break
          }
          case AlignType.Left: {
            break
          }
          case AlignType.CenterHorizontal: {
            break
          }
          case AlignType.Right: {
            break
          }
        }
      },
      undo(data) {
        const { shapes } = getPage(data, currentPageId)
        for (let id in initialPoints) {
          const shape = shapes[id]
          getShapeUtils(shape).translateTo(shape, initialPoints[id])
        }
      },
    })
  )
}
