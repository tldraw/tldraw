import { DistributeType, Utils } from '@tldraw/core'
import { Data } from 'packages/tldraw/src/lib/types'
import { mockData } from '../../../../../specs/__mocks__/mock-data'
import { distribute } from './distribute.command'

describe('Distribute command', () => {
  const data = Utils.deepClone(mockData)
  data.page.shapes['rect3'] = { ...data.page.shapes['rect1'], id: 'rect3', point: [20, 20] }
  data.pageState.selectedIds = ['rect1', 'rect2', 'rect3']

  it('does, undoes and redoes command', () => {
    let tdata = Utils.deepClone(data)

    const command = distribute(tdata, DistributeType.Horizontal)

    console.log(command.after)
    tdata = Utils.deepMerge<Data>(tdata, command.after)
    console.log(tdata.page.shapes)

    expect(tdata.page.shapes['rect3'].point).toEqual([50, 20])

    console.log(command.before)
    tdata = Utils.deepMerge<Data>(tdata, command.before)
    console.log(tdata.page.shapes)

    expect(tdata.page.shapes['rect3'].point).toEqual([20, 20])

    tdata = Utils.deepMerge<Data>(tdata, command.after)

    expect(tdata.page.shapes['rect3'].point).toEqual([50, 20])
  })

  it('distributes vertically', () => {
    let tdata = Utils.deepClone(data)

    tdata = Utils.deepMerge<Data>(tdata, distribute(tdata, DistributeType.Vertical).after)

    expect(tdata.page.shapes['rect3'].point).toEqual([20, 50])
  })
})
