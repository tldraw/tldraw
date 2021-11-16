import { TDSnapshot, TDShapeType } from '~types'
import { TLDR } from '~state/TLDR'
import { TldrawTestApp } from '~test'

const app = new TldrawTestApp().createShapes(
  {
    type: TDShapeType.Rectangle,
    id: 'a',
    childIndex: 1.0,
  },
  {
    type: TDShapeType.Rectangle,
    id: 'b',
    childIndex: 2.0,
  },
  {
    type: TDShapeType.Rectangle,
    id: 'c',
    childIndex: 3,
  },
  {
    type: TDShapeType.Rectangle,
    id: 'd',
    childIndex: 4,
  }
)

const doc = { ...app.document }

function getSortedShapeIds(data: TDSnapshot) {
  return TLDR.getShapes(data, data.appState.currentPageId)
    .sort((a, b) => a.childIndex - b.childIndex)
    .map((shape) => shape.id)
    .join('')
}

function getSortedIndices(data: TDSnapshot) {
  return TLDR.getShapes(data, data.appState.currentPageId)
    .sort((a, b) => a.childIndex - b.childIndex)
    .map((shape) => shape.childIndex.toFixed(2))
    .join(',')
}

describe('Move command', () => {
  beforeEach(() => {
    app.loadDocument(doc)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = app.state
      app.moveToBack()

      const currentState = app.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    app.select('b')
    app.moveToBack()
    expect(getSortedShapeIds(app.state)).toBe('bacd')
    app.undo()
    expect(getSortedShapeIds(app.state)).toBe('abcd')
    app.redo()
    expect(getSortedShapeIds(app.state)).toBe('bacd')
  })

  describe('to back', () => {
    it('moves a shape to back', () => {
      app.select('b')
      app.moveToBack()
      expect(getSortedShapeIds(app.state)).toBe('bacd')
      expect(getSortedIndices(app.state)).toBe('0.50,1.00,3.00,4.00')
    })

    it('moves two adjacent siblings to back', () => {
      app.select('b', 'c')
      app.moveToBack()
      expect(getSortedShapeIds(app.state)).toBe('bcad')
      expect(getSortedIndices(app.state)).toBe('0.33,0.67,1.00,4.00')
    })

    it('moves two non-adjacent siblings to back', () => {
      app.select('b', 'd')
      app.moveToBack()
      expect(getSortedShapeIds(app.state)).toBe('bdac')
      expect(getSortedIndices(app.state)).toBe('0.33,0.67,1.00,3.00')
    })
  })

  describe('backward', () => {
    it('moves a shape backward', () => {
      app.select('c')
      app.moveBackward()
      expect(getSortedShapeIds(app.state)).toBe('acbd')
      expect(getSortedIndices(app.state)).toBe('1.00,1.50,2.00,4.00')
    })

    it('moves a shape at first index backward', () => {
      app.select('a')
      app.moveBackward()
      expect(getSortedShapeIds(app.state)).toBe('abcd')
      expect(getSortedIndices(app.state)).toBe('1.00,2.00,3.00,4.00')
    })

    it('moves two adjacent siblings backward', () => {
      app.select('c', 'd')
      app.moveBackward()
      expect(getSortedShapeIds(app.state)).toBe('acdb')
      expect(getSortedIndices(app.state)).toBe('1.00,1.50,1.67,2.00')
    })

    it('moves two non-adjacent siblings backward', () => {
      app.select('b', 'd')
      app.moveBackward()
      expect(getSortedShapeIds(app.state)).toBe('badc')
      expect(getSortedIndices(app.state)).toBe('0.50,1.00,2.50,3.00')
    })

    it('moves two adjacent siblings backward at zero index', () => {
      app.select('a', 'b')
      app.moveBackward()
      expect(getSortedShapeIds(app.state)).toBe('abcd')
      expect(getSortedIndices(app.state)).toBe('1.00,2.00,3.00,4.00')
    })
  })

  describe('forward', () => {
    it('moves a shape forward', () => {
      app.select('c')
      app.moveForward()
      expect(getSortedShapeIds(app.state)).toBe('abdc')
      expect(getSortedIndices(app.state)).toBe('1.00,2.00,4.00,5.00')
    })

    it('moves a shape forward at the top index', () => {
      app.select('b')
      app.moveForward()
      app.moveForward()
      app.moveForward()
      expect(getSortedShapeIds(app.state)).toBe('acdb')
      expect(getSortedIndices(app.state)).toBe('1.00,3.00,4.00,5.00')
    })

    it('moves two adjacent siblings forward', () => {
      app.select('a', 'b')
      app.moveForward()
      expect(getSortedShapeIds(app.state)).toBe('cabd')
      expect(getSortedIndices(app.state)).toBe('3.00,3.33,3.50,4.00')
    })

    it('moves two non-adjacent siblings forward', () => {
      app.select('a', 'c')
      app.moveForward()
      expect(getSortedShapeIds(app.state)).toBe('badc')
      expect(getSortedIndices(app.state)).toBe('2.00,2.50,4.00,5.00')
    })

    it('moves two adjacent siblings forward at top index', () => {
      app.select('c', 'd')
      app.moveForward()
      expect(getSortedShapeIds(app.state)).toBe('abcd')
      expect(getSortedIndices(app.state)).toBe('1.00,2.00,3.00,4.00')
    })
  })

  describe('to front', () => {
    it('moves a shape to front', () => {
      app.select('b')
      app.moveToFront()
      expect(getSortedShapeIds(app.state)).toBe('acdb')
      expect(getSortedIndices(app.state)).toBe('1.00,3.00,4.00,5.00')
    })

    it('moves two adjacent siblings to front', () => {
      app.select('a', 'b')
      app.moveToFront()
      expect(getSortedShapeIds(app.state)).toBe('cdab')
      expect(getSortedIndices(app.state)).toBe('3.00,4.00,5.00,6.00')
    })

    it('moves two non-adjacent siblings to front', () => {
      app.select('a', 'c')
      app.moveToFront()
      expect(getSortedShapeIds(app.state)).toBe('bdac')
      expect(getSortedIndices(app.state)).toBe('2.00,4.00,5.00,6.00')
    })

    it('moves siblings already at front to front', () => {
      app.select('c', 'd')
      app.moveToFront()
      expect(getSortedShapeIds(app.state)).toBe('abcd')
      expect(getSortedIndices(app.state)).toBe('1.00,2.00,3.00,4.00')
    })
  })
})
