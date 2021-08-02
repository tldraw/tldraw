import { DistributeType, Utils } from '@tldraw/core'
import { mockData } from '../../../../specs/__mocks__/mock-data'
import { distribute } from './distribute.command'

describe('Distribute command', () => {
  const data = Utils.deepClone(mockData)
  data.page.shapes['rect3'] = { ...data.page.shapes['rect1'], id: 'rect3', point: [20, 20] }
  data.pageState.selectedIds = ['rect1', 'rect2', 'rect3']

  it('does, undoes and redoes command', () => {
    const tdata = Utils.deepClone(data)

    const command = distribute(tdata, DistributeType.Horizontal)

    command.redo(tdata)

    expect(tdata.page.shapes['rect3'].point).toEqual([50, 20])

    command.undo(tdata)

    expect(tdata.page.shapes['rect3'].point).toEqual([20, 20])

    command.redo(tdata)

    expect(tdata.page.shapes['rect3'].point).toEqual([50, 20])
  })

  it('distributes vertically', () => {
    const tdata = Utils.deepClone(data)

    distribute(tdata, DistributeType.Vertical).redo(tdata)

    expect(tdata.page.shapes['rect3'].point).toEqual([20, 50])
  })
})
