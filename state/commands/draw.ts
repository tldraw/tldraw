import Command from "./command"
import history from "../history"
import { Data } from "types"
import { getPage } from "utils/utils"
import { getShapeUtils } from "lib/shape-utils"
import { current } from "immer"

export default function drawCommand(
  data: Data,
  id: string,
  before: number[][],
  after: number[][]
) {
  const restoreShape = current(getPage(data).shapes[id])
  getShapeUtils(restoreShape).setPoints!(restoreShape, after)

  history.execute(
    data,
    new Command({
      name: "set_points",
      category: "canvas",
      manualSelection: true,
      do(data, initial) {
        if (!initial) {
          getPage(data).shapes[id] = restoreShape
        }

        data.selectedIds.clear()
      },
      undo(data) {
        delete getPage(data).shapes[id]
        data.selectedIds.clear()
      },
    })
  )
}
