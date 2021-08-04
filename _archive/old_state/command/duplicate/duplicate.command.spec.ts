import { Utils } from '@tldraw/core'
import { mockData } from '../../../../specs/__mocks__/mock-data'
import { state } from '../../state'
import { duplicate } from './duplicate.command'

describe('Style command', () => {
  const data = Utils.deepClone(mockData)
  data.pageState.selectedIds = ['rect1']

  it('does, undoes and redoes command', () => {
    const tdata = Utils.deepClone(data)

    state.history.execute(tdata, duplicate(tdata))

    expect(Object.keys(tdata.page.shapes).length).toBe(3)

    state.history.undo(tdata)

    expect(Object.keys(tdata.page.shapes).length).toBe(2)

    state.history.redo(tdata)

    expect(Object.keys(tdata.page.shapes).length).toBe(3)
  })
})
