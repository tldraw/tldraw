import { Utils } from '@tldraw/core'
import { mockData } from '../../../../specs/__mocks__/mock-data'
import { create } from './create.command'

describe('Mutate command', () => {
  const data = Utils.deepClone(mockData)
  data.pageState.selectedIds = ['rect1']
  const rect3 = { ...data.page.shapes.rect1, id: 'rect3', childIndex: 3 }

  it('does, undoes and redoes command', () => {
    const tdata = Utils.deepClone(data)

    const command = create(tdata, [rect3], false)

    command.redo(tdata)

    expect(tdata.page.shapes['rect3']).toBeTruthy()

    command.undo(tdata)

    expect(tdata.page.shapes['rect3']).toBe(undefined)

    command.redo(tdata)

    expect(tdata.page.shapes['rect3']).toBeTruthy()
  })
})
