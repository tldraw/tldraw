import { Utils } from '@tldraw/core'
import { mockData } from '../../../../specs/__mocks__/mock-data'
import { state } from '../../state'
import { nudge } from './nudge.command'

describe('Nudge command', () => {
  const data = Utils.deepClone(mockData)
  data.pageState.selectedIds = ['rect2']

  it('does, undoes and redoes command', () => {
    const tdata = Utils.deepClone(data)

    state.history.execute(tdata, nudge(tdata, [10, 10]))

    expect(tdata.page.shapes['rect2'].point).toEqual([110, 110])

    state.history.undo(tdata)

    expect(tdata.page.shapes['rect2'].point).toEqual([100, 100])

    state.history.redo(tdata)

    expect(tdata.page.shapes['rect2'].point).toEqual([110, 110])
  })
})
