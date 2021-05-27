import Command from "./command"
import history from "../history"
import { Data } from "types"
import { getPage } from "utils/utils"
import { getShapeUtils } from "lib/shape-utils"

export default function pointsCommand(
  data: Data,
  id: string,
  before: number[][],
  after: number[][]
) {
  history.execute(
    data,
    new Command({
      name: "set_points",
      category: "canvas",
      do(data) {
        const shape = getPage(data).shapes[id]
        getShapeUtils(shape).setPoints!(shape, after)
      },
      undo(data) {
        const shape = getPage(data).shapes[id]
        getShapeUtils(shape).setPoints!(shape, before)
      },
    })
  )
}
