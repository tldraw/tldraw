import { MoveType, Utils } from '@tldraw/core'
import { mockData } from '../../../../specs/__mocks__/mock-data'
import { Data } from '../../../types'
import { state } from '../../state'
import { move } from './move.command'

function getSortedShapeIds(data: Data) {
  return Object.values(data.page.shapes)
    .sort((a, b) => a.childIndex - b.childIndex)
    .map((shape) => shape.id)
    .join('')
}

describe('Nudge command', () => {
  const data = Utils.deepClone(mockData)

  data.page.shapes['a'] = { ...data.page.shapes['rect1'], id: 'a', childIndex: 1 }
  data.page.shapes['b'] = { ...data.page.shapes['rect1'], id: 'b', childIndex: 2 }
  data.page.shapes['c'] = { ...data.page.shapes['rect1'], id: 'c', childIndex: 3 }
  data.page.shapes['d'] = { ...data.page.shapes['rect1'], id: 'd', childIndex: 4 }
  data.pageState.selectedIds = ['a']

  delete data.page.shapes['rect1']
  delete data.page.shapes['rect2']

  it('does, undoes and redoes command', () => {
    const tdata = Utils.deepClone(data)
    tdata.pageState.selectedIds = ['b']

    state.history.execute(tdata, move(tdata, MoveType.ToBack))

    expect(getSortedShapeIds(tdata)).toBe('bacd')

    state.history.undo(tdata)

    expect(getSortedShapeIds(tdata)).toBe('abcd')

    state.history.redo(tdata)

    expect(getSortedShapeIds(tdata)).toBe('bacd')
  })

  describe('to back', () => {
    it('moves a shape to back', () => {
      const tdata = Utils.deepClone(data)
      tdata.pageState.selectedIds = ['b']

      state.history.execute(tdata, move(tdata, MoveType.ToBack))

      expect(getSortedShapeIds(tdata)).toBe('bacd')
    })

    it('moves two adjacent siblings to back', () => {
      const tdata = Utils.deepClone(data)
      tdata.pageState.selectedIds = ['b', 'c']

      state.history.execute(tdata, move(tdata, MoveType.ToBack))

      expect(getSortedShapeIds(tdata)).toBe('bcad')
    })

    it('moves two non-adjacent siblings to back', () => {
      const tdata = Utils.deepClone(data)
      tdata.pageState.selectedIds = ['b', 'd']

      state.history.execute(tdata, move(tdata, MoveType.ToBack))

      expect(getSortedShapeIds(tdata)).toBe('bdac')
    })
  })

  describe('backward', () => {
    it('moves a shape backward', () => {
      const tdata = Utils.deepClone(data)
      tdata.pageState.selectedIds = ['c']

      state.history.execute(tdata, move(tdata, MoveType.Backward))

      expect(getSortedShapeIds(tdata)).toBe('acbd')
    })

    it('moves a shape at first index backward', () => {
      const tdata = Utils.deepClone(data)
      tdata.pageState.selectedIds = ['a']

      state.history.execute(tdata, move(tdata, MoveType.Backward))

      expect(getSortedShapeIds(tdata)).toBe('abcd')
    })

    it('moves two adjacent siblings backward', () => {
      const tdata = Utils.deepClone(data)
      tdata.pageState.selectedIds = ['c', 'd']

      state.history.execute(tdata, move(tdata, MoveType.Backward))

      expect(getSortedShapeIds(tdata)).toBe('acdb')
    })

    it('moves two non-adjacent siblings backward', () => {
      const tdata = Utils.deepClone(data)
      tdata.pageState.selectedIds = ['b', 'd']

      state.history.execute(tdata, move(tdata, MoveType.Backward))

      expect(getSortedShapeIds(tdata)).toBe('badc')
    })

    it('moves two adjacent siblings backward at zero index', () => {
      const tdata = Utils.deepClone(data)
      tdata.pageState.selectedIds = ['a', 'b']

      state.history.execute(tdata, move(tdata, MoveType.Backward))

      expect(getSortedShapeIds(tdata)).toBe('abcd')
    })
  })

  describe('forward', () => {
    it('moves a shape forward', () => {
      const tdata = Utils.deepClone(data)
      tdata.pageState.selectedIds = ['c']

      state.history.execute(tdata, move(tdata, MoveType.Forward))

      expect(getSortedShapeIds(tdata)).toBe('abdc')
    })

    it('moves a shape forward at the top index', () => {
      const tdata = Utils.deepClone(data)
      tdata.pageState.selectedIds = ['d']

      state.history.execute(tdata, move(tdata, MoveType.Forward))

      expect(getSortedShapeIds(tdata)).toBe('abcd')
    })

    it('moves two adjacent siblings forward', () => {
      const tdata = Utils.deepClone(data)
      tdata.pageState.selectedIds = ['a', 'b']

      state.history.execute(tdata, move(tdata, MoveType.Forward))

      expect(getSortedShapeIds(tdata)).toBe('cabd')
    })

    it('moves two non-adjacent siblings forward', () => {
      const tdata = Utils.deepClone(data)
      tdata.pageState.selectedIds = ['a', 'c']

      state.history.execute(tdata, move(tdata, MoveType.Forward))

      expect(getSortedShapeIds(tdata)).toBe('badc')
    })

    it('moves two adjacent siblings forward at top index', () => {
      const tdata = Utils.deepClone(data)
      tdata.pageState.selectedIds = ['c', 'd']

      state.history.execute(tdata, move(tdata, MoveType.Forward))

      expect(getSortedShapeIds(tdata)).toBe('abcd')
    })
  })

  describe('to front', () => {
    it('moves a shape to front', () => {
      const tdata = Utils.deepClone(data)
      tdata.pageState.selectedIds = ['b']

      state.history.execute(tdata, move(tdata, MoveType.ToFront))

      expect(getSortedShapeIds(tdata)).toBe('acdb')
    })

    it('moves two adjacent siblings to front', () => {
      const tdata = Utils.deepClone(data)
      tdata.pageState.selectedIds = ['a', 'b']

      state.history.execute(tdata, move(tdata, MoveType.ToFront))

      expect(getSortedShapeIds(tdata)).toBe('cdab')
    })

    it('moves two non-adjacent siblings to front', () => {
      const tdata = Utils.deepClone(data)
      tdata.pageState.selectedIds = ['a', 'c']

      state.history.execute(tdata, move(tdata, MoveType.ToFront))

      expect(getSortedShapeIds(tdata)).toBe('bdac')
    })

    it('moves siblings already at front to front', () => {
      const tdata = Utils.deepClone(data)
      tdata.pageState.selectedIds = ['c', 'd']

      state.history.execute(tdata, move(tdata, MoveType.ToFront))

      expect(getSortedShapeIds(tdata)).toBe('abcd')
    })
  })
})
