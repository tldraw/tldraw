import { TldrawSnapshot, TldrawShapeType } from '~types'
import { TLDR } from '~state/TLDR'
import { TldrawTestApp } from '~test'

const state = new TldrawTestApp().createShapes(
  {
    type: TldrawShapeType.Rectangle,
    id: 'a',
    childIndex: 1.0,
  },
  {
    type: TldrawShapeType.Rectangle,
    id: 'b',
    childIndex: 2.0,
  },
  {
    type: TldrawShapeType.Rectangle,
    id: 'c',
    childIndex: 3,
  },
  {
    type: TldrawShapeType.Rectangle,
    id: 'd',
    childIndex: 4,
  }
)

const doc = { ...state.document }

function getSortedShapeIds(data: TldrawSnapshot) {
  return TLDR.getShapes(data, data.appState.currentPageId)
    .sort((a, b) => a.childIndex - b.childIndex)
    .map((shape) => shape.id)
    .join('')
}

function getSortedIndices(data: TldrawSnapshot) {
  return TLDR.getShapes(data, data.appState.currentPageId)
    .sort((a, b) => a.childIndex - b.childIndex)
    .map((shape) => shape.childIndex.toFixed(2))
    .join(',')
}

describe('Move command', () => {
  beforeEach(() => {
    state.loadDocument(doc)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = state.state
      state.moveToBack()

      const currentState = state.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    state.select('b')
    state.moveToBack()
    expect(getSortedShapeIds(state.state)).toBe('bacd')
    state.undo()
    expect(getSortedShapeIds(state.state)).toBe('abcd')
    state.redo()
    expect(getSortedShapeIds(state.state)).toBe('bacd')
  })

  describe('to back', () => {
    it('moves a shape to back', () => {
      state.select('b')
      state.moveToBack()
      expect(getSortedShapeIds(state.state)).toBe('bacd')
      expect(getSortedIndices(state.state)).toBe('0.50,1.00,3.00,4.00')
    })

    it('moves two adjacent siblings to back', () => {
      state.select('b', 'c')
      state.moveToBack()
      expect(getSortedShapeIds(state.state)).toBe('bcad')
      expect(getSortedIndices(state.state)).toBe('0.33,0.67,1.00,4.00')
    })

    it('moves two non-adjacent siblings to back', () => {
      state.select('b', 'd')
      state.moveToBack()
      expect(getSortedShapeIds(state.state)).toBe('bdac')
      expect(getSortedIndices(state.state)).toBe('0.33,0.67,1.00,3.00')
    })
  })

  describe('backward', () => {
    it('moves a shape backward', () => {
      state.select('c')
      state.moveBackward()
      expect(getSortedShapeIds(state.state)).toBe('acbd')
      expect(getSortedIndices(state.state)).toBe('1.00,1.50,2.00,4.00')
    })

    it('moves a shape at first index backward', () => {
      state.select('a')
      state.moveBackward()
      expect(getSortedShapeIds(state.state)).toBe('abcd')
      expect(getSortedIndices(state.state)).toBe('1.00,2.00,3.00,4.00')
    })

    it('moves two adjacent siblings backward', () => {
      state.select('c', 'd')
      state.moveBackward()
      expect(getSortedShapeIds(state.state)).toBe('acdb')
      expect(getSortedIndices(state.state)).toBe('1.00,1.50,1.67,2.00')
    })

    it('moves two non-adjacent siblings backward', () => {
      state.select('b', 'd')
      state.moveBackward()
      expect(getSortedShapeIds(state.state)).toBe('badc')
      expect(getSortedIndices(state.state)).toBe('0.50,1.00,2.50,3.00')
    })

    it('moves two adjacent siblings backward at zero index', () => {
      state.select('a', 'b')
      state.moveBackward()
      expect(getSortedShapeIds(state.state)).toBe('abcd')
      expect(getSortedIndices(state.state)).toBe('1.00,2.00,3.00,4.00')
    })
  })

  describe('forward', () => {
    it('moves a shape forward', () => {
      state.select('c')
      state.moveForward()
      expect(getSortedShapeIds(state.state)).toBe('abdc')
      expect(getSortedIndices(state.state)).toBe('1.00,2.00,4.00,5.00')
    })

    it('moves a shape forward at the top index', () => {
      state.select('b')
      state.moveForward()
      state.moveForward()
      state.moveForward()
      expect(getSortedShapeIds(state.state)).toBe('acdb')
      expect(getSortedIndices(state.state)).toBe('1.00,3.00,4.00,5.00')
    })

    it('moves two adjacent siblings forward', () => {
      state.select('a', 'b')
      state.moveForward()
      expect(getSortedShapeIds(state.state)).toBe('cabd')
      expect(getSortedIndices(state.state)).toBe('3.00,3.33,3.50,4.00')
    })

    it('moves two non-adjacent siblings forward', () => {
      state.select('a', 'c')
      state.moveForward()
      expect(getSortedShapeIds(state.state)).toBe('badc')
      expect(getSortedIndices(state.state)).toBe('2.00,2.50,4.00,5.00')
    })

    it('moves two adjacent siblings forward at top index', () => {
      state.select('c', 'd')
      state.moveForward()
      expect(getSortedShapeIds(state.state)).toBe('abcd')
      expect(getSortedIndices(state.state)).toBe('1.00,2.00,3.00,4.00')
    })
  })

  describe('to front', () => {
    it('moves a shape to front', () => {
      state.select('b')
      state.moveToFront()
      expect(getSortedShapeIds(state.state)).toBe('acdb')
      expect(getSortedIndices(state.state)).toBe('1.00,3.00,4.00,5.00')
    })

    it('moves two adjacent siblings to front', () => {
      state.select('a', 'b')
      state.moveToFront()
      expect(getSortedShapeIds(state.state)).toBe('cdab')
      expect(getSortedIndices(state.state)).toBe('3.00,4.00,5.00,6.00')
    })

    it('moves two non-adjacent siblings to front', () => {
      state.select('a', 'c')
      state.moveToFront()
      expect(getSortedShapeIds(state.state)).toBe('bdac')
      expect(getSortedIndices(state.state)).toBe('2.00,4.00,5.00,6.00')
    })

    it('moves siblings already at front to front', () => {
      state.select('c', 'd')
      state.moveToFront()
      expect(getSortedShapeIds(state.state)).toBe('abcd')
      expect(getSortedIndices(state.state)).toBe('1.00,2.00,3.00,4.00')
    })
  })
})
