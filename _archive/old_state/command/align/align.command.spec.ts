import { AlignType, Utils } from '@tldraw/core'
import { mockData } from '../../../../specs/__mocks__/mock-data'
import { state } from '../../state'
import { align } from './align.command'

describe('Align command', () => {
  const data = Utils.deepClone(mockData)
  data.pageState.selectedIds = ['rect1', 'rect2']

  it('does, undoes and redoes command', () => {
    const tdata = Utils.deepClone(data)

    const command = align(tdata, AlignType.Top)

    command.redo(tdata)

    expect(tdata.page.shapes['rect2'].point).toEqual([100, 0])

    command.undo(tdata)

    expect(tdata.page.shapes['rect2'].point).toEqual([100, 100])

    command.redo(tdata)

    expect(tdata.page.shapes['rect2'].point).toEqual([100, 0])
  })

  it('aligns left', () => {
    const tdata = Utils.deepClone(data)

    align(tdata, AlignType.Top).redo(tdata)

    expect(tdata.page.shapes['rect2'].point).toEqual([100, 0])
  })

  it('aligns right', () => {
    const tdata = Utils.deepClone(data)

    align(tdata, AlignType.Right).redo(tdata)

    expect(tdata.page.shapes['rect1'].point).toEqual([100, 0])
  })

  it('aligns bottom', () => {
    const tdata = Utils.deepClone(data)

    align(tdata, AlignType.Bottom).redo(tdata)

    expect(tdata.page.shapes['rect1'].point).toEqual([0, 100])
  })

  it('aligns left', () => {
    const tdata = Utils.deepClone(data)

    align(tdata, AlignType.Left).redo(tdata)

    expect(tdata.page.shapes['rect2'].point).toEqual([0, 100])
  })

  it('aligns center horizontal', () => {
    const tdata = Utils.deepClone(data)

    align(tdata, AlignType.CenterHorizontal).redo(tdata)

    expect(tdata.page.shapes['rect1'].point).toEqual([50, 0])
    expect(tdata.page.shapes['rect2'].point).toEqual([50, 100])
  })

  it('aligns center vertical', () => {
    const tdata = Utils.deepClone(data)

    align(tdata, AlignType.CenterVertical).redo(tdata)

    expect(tdata.page.shapes['rect1'].point).toEqual([0, 50])
    expect(tdata.page.shapes['rect2'].point).toEqual([100, 50])
  })
})
