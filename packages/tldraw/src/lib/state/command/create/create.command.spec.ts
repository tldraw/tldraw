import { Utils } from '@tldraw/core'
import { mockData } from '../../../../specs/__mocks__/mock-data'
import { state } from '../../state'
import { create } from './create.command'

describe('Mutate command', () => {
  const data = Utils.deepClone(mockData)
  data.pageState.selectedIds = ['rect1']
  const rect3 = { ...data.page.shapes.rect1, id: 'rect3', childIndex: 3 }

  it('does, undoes and redoes command', () => {
    const tdata = Utils.deepClone(data)

    state.history.execute(tdata, create(tdata, [rect3], false))

    expect(tdata.page.shapes['rect3']).toBeTruthy()

    state.history.undo(tdata)

    expect(tdata.page.shapes['rect3']).toBe(undefined)

    state.history.redo(tdata)

    expect(tdata.page.shapes['rect3']).toBeTruthy()
  })
})
