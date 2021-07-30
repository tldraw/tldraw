import { Utils } from '@tldraw/core'
import { mockData } from '../../../../specs/__mocks__/mock-data'
import { mutate } from './mutate.command'

describe('Mutate command', () => {
  const data = Utils.deepClone(mockData)
  data.pageState.selectedIds = ['rect1']

  it('does, undoes and redoes command', () => {
    const tdata = Utils.deepClone(data)

    expect(tdata.page.shapes['rect1'].point).toEqual([0, 0])

    const before = Utils.deepClone(tdata.page.shapes['rect1'])

    tdata.page.shapes['rect1'].point = [100, 0]

    const after = Utils.deepClone(tdata.page.shapes['rect1'])

    const command = mutate(tdata, [before], [after])

    command.redo(tdata, false)

    expect(tdata.page.shapes['rect1'].point).toEqual([100, 0])

    command.undo(tdata)

    expect(tdata.page.shapes['rect1'].point).toEqual([0, 0])

    command.redo(tdata, true)

    expect(tdata.page.shapes['rect1'].point).toEqual([100, 0])
  })
})
