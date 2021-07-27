import { Utils } from '@tldraw/core'
import { mockData } from '../../../../specs/__mocks__/mock-data'
import { state } from '../../state'
import { mutate } from './mutate.command'

describe('Mutate command', () => {
  const data = Utils.deepClone(mockData)
  data.pageState.selectedIds = ['rect1']

  it('does, undoes and redoes command', () => {
    const tdata = Utils.deepClone(data)
    const before = Utils.deepClone(tdata.page.shapes['rect1'])
    tdata.page.shapes['rect1'].point = [100, 0]
    const after = Utils.deepClone(tdata.page.shapes['rect1'])

    state.history.execute(tdata, mutate(tdata, [before], [after]))

    expect(tdata.page.shapes['rect1'].point).toEqual([100, 0])

    state.history.undo(tdata)

    expect(tdata.page.shapes['rect1'].point).toEqual([0, 0])

    state.history.redo(tdata)

    expect(tdata.page.shapes['rect1'].point).toEqual([100, 0])
  })
})
