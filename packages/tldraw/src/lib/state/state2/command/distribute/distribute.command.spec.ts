import { DistributeType, Utils } from '@tldraw/core'
import { mockData } from '../../../../../specs/__mocks__/mock-data'
import { distribute } from './distribute.command'

describe('Distribute command', () => {
  const data = Utils.deepClone(mockData)
  data.page.shapes['rect3'] = { ...data.page.shapes['rect1'], id: 'rect3', point: [20, 20] }
  data.pageState.selectedIds = ['rect1', 'rect2', 'rect3']

  it('does, undoes and redoes command', () => {
    let tdata = Utils.deepClone(data)

    const command = distribute(tdata, DistributeType.Horizontal)

    tdata = command.do(tdata)

    expect(tdata.page.shapes['rect3'].point).toEqual([50, 20])

    tdata = command.undo(tdata)

    expect(tdata.page.shapes['rect3'].point).toEqual([20, 20])

    tdata = command.do(tdata)

    expect(tdata.page.shapes['rect3'].point).toEqual([50, 20])
  })

  it('distributes vertically', () => {
    let tdata = Utils.deepClone(data)

    tdata = distribute(tdata, DistributeType.Vertical).do(tdata)

    expect(tdata.page.shapes['rect3'].point).toEqual([20, 50])
  })
})
