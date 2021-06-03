import Command from './command'
import history from '../history'
import { Data } from 'types'
import { getPage, getSelectedShapes } from 'utils/utils'
import { getShapeUtils } from 'lib/shape-utils'
import * as vec from 'utils/vec'

export default function changePage(data: Data, pageId: string) {
  const { currentPageId: prevPageId } = data

  history.execute(
    data,
    new Command({
      name: 'change_page',
      category: 'canvas',
      do(data) {
        data.currentPageId = pageId
      },
      undo(data) {
        data.currentPageId = prevPageId
      },
    })
  )
}
