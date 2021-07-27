import { Utils } from '@tldraw/core'
import { mockData } from '../../../../specs/__mocks__/mock-data'
import { SizeStyle } from '../../../shape'
import { state } from '../../state'
import { style } from './style.command'

describe('Style command', () => {
  const data = Utils.deepClone(mockData)
  data.pageState.selectedIds = ['rect1']

  it('does, undoes and redoes command', () => {
    const tdata = Utils.deepClone(data)

    state.history.execute(tdata, style(tdata, { size: SizeStyle.Large }))

    expect(tdata.page.shapes['rect1'].point).toEqual([100, 0])

    state.history.undo(tdata)

    expect(tdata.page.shapes['rect1'].point).toEqual([0, 0])

    state.history.redo(tdata)

    expect(tdata.page.shapes['rect1'].point).toEqual([100, 0])
  })
})
