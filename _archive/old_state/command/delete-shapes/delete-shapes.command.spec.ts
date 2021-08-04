import { Utils } from '@tldraw/core'
import { mockData } from '../../../../specs/__mocks__/mock-data'
import { deleteShapes } from './delete-shapes.command'

describe('Delete shapes command', () => {
  const data = Utils.deepClone(mockData)
  data.pageState.selectedIds = ['rect1']

  it('does, undoes and redoes command', () => {
    const tdata = Utils.deepClone(data)

    const command = deleteShapes(tdata)

    command.redo(tdata)

    expect(Object.keys(tdata.page.shapes).length).toBe(1)

    command.undo(tdata)

    expect(Object.keys(tdata.page.shapes).length).toBe(2)

    command.redo(tdata)

    expect(Object.keys(tdata.page.shapes).length).toBe(1)
  })
})
