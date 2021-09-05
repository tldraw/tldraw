import { TLDrawState } from '~state'
import { Data, TLDrawShapeType } from '~types'
import { TLDR } from '~state/tldr'

const tlstate = new TLDrawState().createShapes(
  {
    type: TLDrawShapeType.Rectangle,
    id: 'a',
    childIndex: 1.0,
  },
  {
    type: TLDrawShapeType.Rectangle,
    id: 'b',
    childIndex: 2.0,
  },
  {
    type: TLDrawShapeType.Rectangle,
    id: 'c',
    childIndex: 3,
  },
  {
    type: TLDrawShapeType.Rectangle,
    id: 'd',
    childIndex: 4,
  }
)

const doc = { ...tlstate.document }

function getSortedShapeIds(data: Data) {
  return TLDR.getShapes(data, data.appState.currentPageId)
    .sort((a, b) => a.childIndex - b.childIndex)
    .map((shape) => shape.id)
    .join('')
}

function getSortedIndices(data: Data) {
  return TLDR.getShapes(data, data.appState.currentPageId)
    .sort((a, b) => a.childIndex - b.childIndex)
    .map((shape) => shape.childIndex.toFixed(2))
    .join(',')
}

describe('Move command', () => {
  it('does, undoes and redoes command', () => {
    tlstate.loadDocument(doc)
    tlstate.select('b')
    tlstate.moveToBack()
    expect(getSortedShapeIds(tlstate.state)).toBe('bacd')
    tlstate.undo()
    expect(getSortedShapeIds(tlstate.state)).toBe('abcd')
    tlstate.redo()
    expect(getSortedShapeIds(tlstate.state)).toBe('bacd')
  })

  describe('to back', () => {
    it('moves a shape to back', () => {
      tlstate.loadDocument(doc)
      tlstate.select('b')
      tlstate.moveToBack()
      expect(getSortedShapeIds(tlstate.state)).toBe('bacd')
      expect(getSortedIndices(tlstate.state)).toBe('0.50,1.00,3.00,4.00')
    })

    it('moves two adjacent siblings to back', () => {
      tlstate.loadDocument(doc)
      tlstate.select('b', 'c')
      tlstate.moveToBack()
      expect(getSortedShapeIds(tlstate.state)).toBe('bcad')
      expect(getSortedIndices(tlstate.state)).toBe('0.33,0.67,1.00,4.00')
    })

    it('moves two non-adjacent siblings to back', () => {
      tlstate.loadDocument(doc)
      tlstate.select('b', 'd')
      tlstate.moveToBack()
      expect(getSortedShapeIds(tlstate.state)).toBe('bdac')
      expect(getSortedIndices(tlstate.state)).toBe('0.33,0.67,1.00,3.00')
    })
  })

  describe('backward', () => {
    it('moves a shape backward', () => {
      tlstate.loadDocument(doc)
      tlstate.select('c')
      tlstate.moveBackward()
      expect(getSortedShapeIds(tlstate.state)).toBe('acbd')
      expect(getSortedIndices(tlstate.state)).toBe('1.00,1.50,2.00,4.00')
    })

    it('moves a shape at first index backward', () => {
      tlstate.loadDocument(doc)
      tlstate.select('a')
      tlstate.moveBackward()
      expect(getSortedShapeIds(tlstate.state)).toBe('abcd')
      expect(getSortedIndices(tlstate.state)).toBe('1.00,2.00,3.00,4.00')
    })

    it('moves two adjacent siblings backward', () => {
      tlstate.loadDocument(doc)
      tlstate.select('c', 'd')
      tlstate.moveBackward()
      expect(getSortedShapeIds(tlstate.state)).toBe('acdb')
      expect(getSortedIndices(tlstate.state)).toBe('1.00,1.50,1.67,2.00')
    })

    it('moves two non-adjacent siblings backward', () => {
      tlstate.loadDocument(doc)
      tlstate.select('b', 'd')
      tlstate.moveBackward()
      expect(getSortedShapeIds(tlstate.state)).toBe('badc')
      expect(getSortedIndices(tlstate.state)).toBe('0.50,1.00,2.50,3.00')
    })

    it('moves two adjacent siblings backward at zero index', () => {
      tlstate.loadDocument(doc)
      tlstate.select('a', 'b')
      tlstate.moveBackward()
      expect(getSortedShapeIds(tlstate.state)).toBe('abcd')
      expect(getSortedIndices(tlstate.state)).toBe('1.00,2.00,3.00,4.00')
    })
  })

  describe('forward', () => {
    it('moves a shape forward', () => {
      tlstate.loadDocument(doc)
      tlstate.select('c')
      tlstate.moveForward()
      expect(getSortedShapeIds(tlstate.state)).toBe('abdc')
      expect(getSortedIndices(tlstate.state)).toBe('1.00,2.00,4.00,5.00')
    })

    it('moves a shape forward at the top index', () => {
      tlstate.loadDocument(doc)
      tlstate.select('b')
      tlstate.moveForward()
      tlstate.moveForward()
      tlstate.moveForward()
      expect(getSortedShapeIds(tlstate.state)).toBe('acdb')
      expect(getSortedIndices(tlstate.state)).toBe('1.00,3.00,4.00,5.00')
    })

    it('moves two adjacent siblings forward', () => {
      tlstate.loadDocument(doc)
      tlstate.select('a', 'b')
      tlstate.moveForward()
      expect(getSortedShapeIds(tlstate.state)).toBe('cabd')
      expect(getSortedIndices(tlstate.state)).toBe('3.00,3.33,3.50,4.00')
    })

    it('moves two non-adjacent siblings forward', () => {
      tlstate.loadDocument(doc)
      tlstate.select('a', 'c')
      tlstate.moveForward()
      expect(getSortedShapeIds(tlstate.state)).toBe('badc')
      expect(getSortedIndices(tlstate.state)).toBe('2.00,2.50,4.00,5.00')
    })

    it('moves two adjacent siblings forward at top index', () => {
      tlstate.loadDocument(doc)
      tlstate.select('c', 'd')
      tlstate.moveForward()
      expect(getSortedShapeIds(tlstate.state)).toBe('abcd')
      expect(getSortedIndices(tlstate.state)).toBe('1.00,2.00,3.00,4.00')
    })
  })

  describe('to front', () => {
    it('moves a shape to front', () => {
      tlstate.loadDocument(doc)
      tlstate.select('b')
      tlstate.moveToFront()
      expect(getSortedShapeIds(tlstate.state)).toBe('acdb')
      expect(getSortedIndices(tlstate.state)).toBe('1.00,3.00,4.00,5.00')
    })

    it('moves two adjacent siblings to front', () => {
      tlstate.loadDocument(doc)
      tlstate.select('a', 'b')
      tlstate.moveToFront()
      expect(getSortedShapeIds(tlstate.state)).toBe('cdab')
      expect(getSortedIndices(tlstate.state)).toBe('3.00,4.00,5.00,6.00')
    })

    it('moves two non-adjacent siblings to front', () => {
      tlstate.loadDocument(doc)
      tlstate.select('a', 'c')
      tlstate.moveToFront()
      expect(getSortedShapeIds(tlstate.state)).toBe('bdac')
      expect(getSortedIndices(tlstate.state)).toBe('2.00,4.00,5.00,6.00')
    })

    it('moves siblings already at front to front', () => {
      tlstate.loadDocument(doc)
      tlstate.select('c', 'd')
      tlstate.moveToFront()
      expect(getSortedShapeIds(tlstate.state)).toBe('abcd')
      expect(getSortedIndices(tlstate.state)).toBe('1.00,2.00,3.00,4.00')
    })
  })
})
