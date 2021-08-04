import { Utils } from '@tldraw/core'
import { mockData } from '../../../../specs/__mocks__/mock-data'
import { translate } from './translate.command'

describe('Translate command', () => {
  const data = Utils.deepClone(mockData)
  data.pageState.selectedIds = ['rect2']

  it('does, undoes and redoes command', () => {
    const tdata = Utils.deepClone(data)

    const command = translate(tdata, [10, 10])

    command.redo(tdata)

    expect(tdata.page.shapes['rect2'].point).toEqual([110, 110])

    command.undo(tdata)

    expect(tdata.page.shapes['rect2'].point).toEqual([100, 100])

    command.redo(tdata)

    expect(tdata.page.shapes['rect2'].point).toEqual([110, 110])
  })
})
