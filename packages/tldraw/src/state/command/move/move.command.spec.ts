import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { Utils } from '@tldraw/core'
import type { Data } from '~types'
import { TLDR } from '~state/tldr'

const doc = Utils.deepClone(mockDocument)

doc.pages.page1.shapes['a'] = {
  ...doc.pages.page1.shapes['rect1'],
  id: 'a',
  childIndex: 1,
}
doc.pages.page1.shapes['b'] = {
  ...doc.pages.page1.shapes['rect1'],
  id: 'b',
  childIndex: 2,
}
doc.pages.page1.shapes['c'] = {
  ...doc.pages.page1.shapes['rect1'],
  id: 'c',
  childIndex: 3,
}
doc.pages.page1.shapes['d'] = {
  ...doc.pages.page1.shapes['rect1'],
  id: 'd',
  childIndex: 4,
}
doc.pageStates.page1.selectedIds = ['a']

delete doc.pages.page1.shapes['rect1']
delete doc.pages.page1.shapes['rect2']
delete doc.pages.page1.shapes['rect3']

function getSortedShapeIds(data: Data) {
  return TLDR.getShapes(data, data.appState.currentPageId)
    .sort((a, b) => a.childIndex - b.childIndex)
    .map((shape) => shape.id)
    .join('')
}

describe('Move command', () => {
  const tlstate = new TLDrawState()

  beforeEach(() => {
    tlstate.loadDocument(doc)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = tlstate.state
      tlstate.moveToBack()

      const currentState = tlstate.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
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
      tlstate.select('b')
      tlstate.moveToBack()
      expect(getSortedShapeIds(tlstate.state)).toBe('bacd')
    })

    it('moves two adjacent siblings to back', () => {
      tlstate.select('b', 'c')
      tlstate.moveToBack()
      expect(getSortedShapeIds(tlstate.state)).toBe('bcad')
    })

    it('moves two non-adjacent siblings to back', () => {
      tlstate.select('b', 'd')
      tlstate.moveToBack()
      expect(getSortedShapeIds(tlstate.state)).toBe('bdac')
    })
  })

  describe('backward', () => {
    it('moves a shape backward', () => {
      tlstate.select('c')
      tlstate.moveBackward()
      expect(getSortedShapeIds(tlstate.state)).toBe('acbd')
    })

    it('moves a shape at first index backward', () => {
      tlstate.select('a')
      tlstate.moveBackward()
      expect(getSortedShapeIds(tlstate.state)).toBe('abcd')
    })

    it('moves two adjacent siblings backward', () => {
      tlstate.select('c', 'd')
      tlstate.moveBackward()
      expect(getSortedShapeIds(tlstate.state)).toBe('acdb')
    })

    it('moves two non-adjacent siblings backward', () => {
      tlstate.select('b', 'd')
      tlstate.moveBackward()
      expect(getSortedShapeIds(tlstate.state)).toBe('badc')
    })

    it('moves two adjacent siblings backward at zero index', () => {
      tlstate.select('a', 'b')
      tlstate.moveBackward()
      expect(getSortedShapeIds(tlstate.state)).toBe('abcd')
    })
  })

  describe('forward', () => {
    it('moves a shape forward', () => {
      tlstate.select('c')
      tlstate.moveForward()
      expect(getSortedShapeIds(tlstate.state)).toBe('abdc')
    })

    it('moves a shape forward at the top index', () => {
      tlstate.select('b')
      tlstate.moveForward()
      tlstate.moveForward()
      tlstate.moveForward()
      expect(getSortedShapeIds(tlstate.state)).toBe('acdb')
    })

    it('moves two adjacent siblings forward', () => {
      tlstate.select('a', 'b')
      tlstate.moveForward()
      expect(getSortedShapeIds(tlstate.state)).toBe('cabd')
    })

    it('moves two non-adjacent siblings forward', () => {
      tlstate.select('a', 'c')
      tlstate.moveForward()
      expect(getSortedShapeIds(tlstate.state)).toBe('badc')
    })

    it('moves two adjacent siblings forward at top index', () => {
      tlstate.select('c', 'd')
      tlstate.moveForward()
      expect(getSortedShapeIds(tlstate.state)).toBe('abcd')
    })
  })

  describe('to front', () => {
    it('moves a shape to front', () => {
      tlstate.select('b')
      tlstate.moveToFront()
      expect(getSortedShapeIds(tlstate.state)).toBe('acdb')
    })

    it('moves two adjacent siblings to front', () => {
      tlstate.select('a', 'b')
      tlstate.moveToFront()
      expect(getSortedShapeIds(tlstate.state)).toBe('cdab')
    })

    it('moves two non-adjacent siblings to front', () => {
      tlstate.select('a', 'c')
      tlstate.moveToFront()
      expect(getSortedShapeIds(tlstate.state)).toBe('bdac')
    })

    it('moves siblings already at front to front', () => {
      tlstate.select('c', 'd')
      tlstate.moveToFront()
      expect(getSortedShapeIds(tlstate.state)).toBe('abcd')
    })
  })
})
