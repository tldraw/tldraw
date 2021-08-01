import { AlignType, Utils } from '@tldraw/core'
import { Data } from 'packages/tldraw/src/lib/types'
import { mockData } from '../../../../../specs/__mocks__/mock-data'
import { align } from './align.command'

describe('Align command', () => {
  const data = Utils.deepClone(mockData)
  data.pageState.selectedIds = ['rect1', 'rect2']

  it('does, undoes and redoes command', () => {
    let tdata = Utils.deepClone(data)

    const command = align(tdata, AlignType.Top)

    tdata = Utils.deepMerge<Data>(tdata, command.after)

    expect(tdata.page.shapes['rect2'].point).toEqual([100, 0])

    tdata = Utils.deepMerge<Data>(tdata, command.before)

    expect(tdata.page.shapes['rect2'].point).toEqual([100, 100])

    tdata = Utils.deepMerge<Data>(tdata, command.after)

    expect(tdata.page.shapes['rect2'].point).toEqual([100, 0])
  })

  it('aligns left', () => {
    let tdata = Utils.deepClone(data)

    tdata = Utils.deepMerge<Data>(tdata, align(tdata, AlignType.Top).after)

    expect(tdata.page.shapes['rect2'].point).toEqual([100, 0])
  })

  it('aligns right', () => {
    let tdata = Utils.deepClone(data)

    tdata = Utils.deepMerge<Data>(tdata, align(tdata, AlignType.Right).after)

    expect(tdata.page.shapes['rect1'].point).toEqual([100, 0])
  })

  it('aligns bottom', () => {
    let tdata = Utils.deepClone(data)

    tdata = Utils.deepMerge<Data>(tdata, align(tdata, AlignType.Bottom).after)

    expect(tdata.page.shapes['rect1'].point).toEqual([0, 100])
  })

  it('aligns left', () => {
    let tdata = Utils.deepClone(data)

    tdata = Utils.deepMerge<Data>(tdata, align(tdata, AlignType.Left).after)

    expect(tdata.page.shapes['rect2'].point).toEqual([0, 100])
  })

  it('aligns center horizontal', () => {
    let tdata = Utils.deepClone(data)

    tdata = Utils.deepMerge<Data>(tdata, align(tdata, AlignType.CenterHorizontal).after)

    expect(tdata.page.shapes['rect1'].point).toEqual([50, 0])
    expect(tdata.page.shapes['rect2'].point).toEqual([50, 100])
  })

  it('aligns center vertical', () => {
    let tdata = Utils.deepClone(data)

    tdata = Utils.deepMerge<Data>(tdata, align(tdata, AlignType.CenterVertical).after)

    expect(tdata.page.shapes['rect1'].point).toEqual([0, 50])
    expect(tdata.page.shapes['rect2'].point).toEqual([100, 50])
  })
})
