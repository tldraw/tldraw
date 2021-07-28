import { StretchType, Utils } from '@tldraw/core'
import { mockData } from '../../../../specs/__mocks__/mock-data'
import { RectangleShape } from '../../../shape'
import { state } from '../../state'
import { stretch } from './stretch.command'

describe('Stretch command', () => {
  const data = Utils.deepClone(mockData)
  data.pageState.selectedIds = ['rect1', 'rect2']

  it('does, undoes and redoes command', () => {
    const tdata = Utils.deepClone(data)

    const rect1 = tdata.page.shapes['rect1'] as RectangleShape
    const rect2 = tdata.page.shapes['rect2'] as RectangleShape

    state.history.execute(tdata, stretch(tdata, StretchType.Horizontal))

    expect(rect1.point).toEqual([0, 0])
    expect(rect1.size).toEqual([200, 100])
    expect(rect2.point).toEqual([0, 100])
    expect(rect2.size).toEqual([200, 100])

    state.history.undo(tdata)

    expect(rect1.point).toEqual([0, 0])
    expect(rect1.size).toEqual([100, 100])
    expect(rect2.point).toEqual([100, 100])
    expect(rect2.size).toEqual([100, 100])

    state.history.redo(tdata)

    expect(rect1.point).toEqual([0, 0])
    expect(rect1.size).toEqual([200, 100])
    expect(rect2.point).toEqual([0, 100])
    expect(rect2.size).toEqual([200, 100])
  })

  it('stretches horizontal', () => {
    const tdata = Utils.deepClone(data)

    const rect1 = tdata.page.shapes['rect1'] as RectangleShape
    const rect2 = tdata.page.shapes['rect2'] as RectangleShape

    state.history.execute(tdata, stretch(tdata, StretchType.Horizontal))

    expect(rect1.point).toEqual([0, 0])
    expect(rect1.size).toEqual([200, 100])
    expect(rect2.point).toEqual([0, 100])
    expect(rect2.size).toEqual([200, 100])
  })

  it('stretches vertical', () => {
    const tdata = Utils.deepClone(data)

    const rect1 = tdata.page.shapes['rect1'] as RectangleShape
    const rect2 = tdata.page.shapes['rect2'] as RectangleShape

    state.history.execute(tdata, stretch(tdata, StretchType.Vertical))

    expect(rect1.point).toEqual([0, 0])
    expect(rect1.size).toEqual([100, 200])
    expect(rect2.point).toEqual([100, 0])
    expect(rect2.size).toEqual([100, 200])
  })
})
