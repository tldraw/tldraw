import { StretchType, Utils } from '@tldraw/core'
import { mockData } from '../../../../specs/__mocks__/mock-data'
import { RectangleShape } from '../../../shape'
import { TLD } from '../../tld'
import { stretch } from './stretch.command'

describe('Stretch command', () => {
  const data = Utils.deepClone(mockData)
  data.pageState.selectedIds = ['rect1', 'rect2']

  it('does, undoes and redoes command', () => {
    const tdata = Utils.deepClone(data)

    const command = stretch(tdata, StretchType.Horizontal)

    command.redo(tdata)

    expect(TLD.getShape<RectangleShape>(tdata, 'rect1').point).toStrictEqual([0, 0])
    expect(TLD.getShape<RectangleShape>(tdata, 'rect1').size).toStrictEqual([200, 100])
    expect(TLD.getShape<RectangleShape>(tdata, 'rect2').point).toStrictEqual([0, 100])
    expect(TLD.getShape<RectangleShape>(tdata, 'rect2').size).toStrictEqual([200, 100])

    command.undo(tdata)

    expect(TLD.getShape<RectangleShape>(tdata, 'rect1').point).toStrictEqual([0, 0])
    expect(TLD.getShape<RectangleShape>(tdata, 'rect1').size).toStrictEqual([100, 100])
    expect(TLD.getShape<RectangleShape>(tdata, 'rect2').point).toStrictEqual([100, 100])
    expect(TLD.getShape<RectangleShape>(tdata, 'rect2').size).toStrictEqual([100, 100])

    command.redo(tdata)
  })

  it('stretches horizontal', () => {
    const tdata = Utils.deepClone(data)

    stretch(tdata, StretchType.Horizontal).redo(tdata)

    expect(TLD.getShape<RectangleShape>(tdata, 'rect1').point).toStrictEqual([0, 0])
    expect(TLD.getShape<RectangleShape>(tdata, 'rect1').size).toStrictEqual([200, 100])
    expect(TLD.getShape<RectangleShape>(tdata, 'rect2').point).toStrictEqual([0, 100])
    expect(TLD.getShape<RectangleShape>(tdata, 'rect2').size).toStrictEqual([200, 100])
  })

  it('stretches vertical', () => {
    const tdata = Utils.deepClone(data)

    stretch(tdata, StretchType.Vertical).redo(tdata)

    expect(TLD.getShape<RectangleShape>(tdata, 'rect1').point).toStrictEqual([0, 0])
    expect(TLD.getShape<RectangleShape>(tdata, 'rect1').size).toStrictEqual([100, 200])
    expect(TLD.getShape<RectangleShape>(tdata, 'rect2').point).toStrictEqual([100, 0])
    expect(TLD.getShape<RectangleShape>(tdata, 'rect2').size).toStrictEqual([100, 200])
  })
})
