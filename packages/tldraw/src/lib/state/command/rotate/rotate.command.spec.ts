import { Utils } from '@tldraw/core'
import { mockData } from '../../../../specs/__mocks__/mock-data'
import { state } from '../../state'
import { rotate } from './rotate.command'

describe('Style command', () => {
  const data = Utils.deepClone(mockData)
  data.pageState.selectedIds = ['rect1']

  it('does, undoes and redoes command', () => {
    const tdata = Utils.deepClone(data)

    state.history.execute(tdata, rotate(tdata))

    expect(tdata.page.shapes['rect1'].rotation).toBe(Math.PI * (6 / 4))

    state.history.undo(tdata)

    expect(tdata.page.shapes['rect1'].rotation).toBe(0)

    state.history.redo(tdata)

    expect(tdata.page.shapes['rect1'].rotation).toBe(Math.PI * (6 / 4))
  })
})
