import Command from "./command"
import history from "../history"
import { AlignType, Data, DistributeType } from "types"
import { getPage } from "utils/utils"
import { getShapeUtils } from "lib/shape-utils"

export default function distributeCommand(data: Data, type: DistributeType) {
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
      name: "distributed",
      category: "canvas",
      do(data) {
        const { shapes } = getPage(data, currentPageId)

        switch (type) {
          case DistributeType.Horizontal: {
          }
          case DistributeType.Vertical: {
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
