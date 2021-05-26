import Command from "./command"
import history from "../history"
import { StretchType, Data } from "types"
import { getPage } from "utils/utils"
import { getShapeUtils } from "lib/shape-utils"

export default function stretchCommand(data: Data, type: StretchType) {
  const { currentPageId } = data

  const initialPoints = Object.fromEntries(
    Object.entries(getPage(data).shapes).map(([id, shape]) => [id, shape.point])
  )

  history.execute(
    data,
    new Command({
      name: "distributed",
      category: "canvas",
      do(data) {
        const { shapes } = getPage(data, currentPageId)

        switch (type) {
          case StretchType.Horizontal: {
          }
          case StretchType.Vertical: {
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
