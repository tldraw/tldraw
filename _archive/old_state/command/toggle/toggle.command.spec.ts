import { Utils } from '@tldraw/core'
import { mockData } from '../../../../specs/__mocks__/mock-data'
import { state } from '../../state'
import { toggle } from './toggle.command'

describe('Style command', () => {
  const data = Utils.deepClone(mockData)
  data.pageState.selectedIds = ['rect1']

  it('does, undoes and redoes command', () => {
    const tdata = Utils.deepClone(data)

    state.history.execute(tdata, toggle(tdata, 'isLocked'))

    expect(tdata.page.shapes['rect1'].isLocked).toBe(true)

    state.history.undo(tdata)

    expect(tdata.page.shapes['rect1'].isLocked).toBe(undefined)

    state.history.redo(tdata)

    expect(tdata.page.shapes['rect1'].isLocked).toBe(true)
  })
})
