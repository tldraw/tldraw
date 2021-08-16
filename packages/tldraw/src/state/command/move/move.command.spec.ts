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
  return TLDR.getShapes(data)
    .sort((a, b) => a.childIndex - b.childIndex)
    .map((shape) => shape.id)
    .join('')
}

describe('Move command', () => {
  const tlstate = new TLDrawState()

  it('does, undoes and redoes command', () => {
    tlstate.loadDocument(doc)
    tlstate.setSelectedIds(['b'])
    tlstate.moveToBack()
    expect(getSortedShapeIds(tlstate.data)).toBe('bacd')
    tlstate.undo()
    expect(getSortedShapeIds(tlstate.data)).toBe('abcd')
    tlstate.redo()
    expect(getSortedShapeIds(tlstate.data)).toBe('bacd')
  })

  describe('to back', () => {
    it('moves a shape to back', () => {
      tlstate.loadDocument(doc)
      tlstate.setSelectedIds(['b'])
      tlstate.moveToBack()
      expect(getSortedShapeIds(tlstate.data)).toBe('bacd')
    })

    it('moves two adjacent siblings to back', () => {
      tlstate.loadDocument(doc)
      tlstate.setSelectedIds(['b', 'c'])
      tlstate.moveToBack()
      expect(getSortedShapeIds(tlstate.data)).toBe('bcad')
    })

    it('moves two non-adjacent siblings to back', () => {
      tlstate.loadDocument(doc)
      tlstate.setSelectedIds(['b', 'd'])
      tlstate.moveToBack()
      expect(getSortedShapeIds(tlstate.data)).toBe('bdac')
    })
  })

  describe('backward', () => {
    it('moves a shape backward', () => {
      tlstate.loadDocument(doc)
      tlstate.setSelectedIds(['c'])
      tlstate.moveBackward()
      expect(getSortedShapeIds(tlstate.data)).toBe('acbd')
    })

    it('moves a shape at first index backward', () => {
      tlstate.loadDocument(doc)
      tlstate.setSelectedIds(['a'])
      tlstate.moveBackward()
      expect(getSortedShapeIds(tlstate.data)).toBe('abcd')
    })

    it('moves two adjacent siblings backward', () => {
      tlstate.loadDocument(doc)
      tlstate.setSelectedIds(['c', 'd'])
      tlstate.moveBackward()
      expect(getSortedShapeIds(tlstate.data)).toBe('acdb')
    })

    it('moves two non-adjacent siblings backward', () => {
      tlstate.loadDocument(doc)
      tlstate.setSelectedIds(['b', 'd'])
      tlstate.moveBackward()
      expect(getSortedShapeIds(tlstate.data)).toBe('badc')
    })

    it('moves two adjacent siblings backward at zero index', () => {
      tlstate.loadDocument(doc)
      tlstate.setSelectedIds(['a', 'b'])
      tlstate.moveBackward()
      expect(getSortedShapeIds(tlstate.data)).toBe('abcd')
    })
  })

  describe('forward', () => {
    it('moves a shape forward', () => {
      tlstate.loadDocument(doc)
      tlstate.setSelectedIds(['c'])
      tlstate.moveForward()
      expect(getSortedShapeIds(tlstate.data)).toBe('abdc')
    })

    it('moves a shape forward at the top index', () => {
      tlstate.loadDocument(doc)
      tlstate.setSelectedIds(['b'])
      tlstate.moveForward()
      tlstate.moveForward()
      tlstate.moveForward()
      expect(getSortedShapeIds(tlstate.data)).toBe('acdb')
    })

    it('moves two adjacent siblings forward', () => {
      tlstate.loadDocument(doc)
      tlstate.setSelectedIds(['a', 'b'])
      tlstate.moveForward()
      expect(getSortedShapeIds(tlstate.data)).toBe('cabd')
    })

    it('moves two non-adjacent siblings forward', () => {
      tlstate.loadDocument(doc)
      tlstate.setSelectedIds(['a', 'c'])
      tlstate.moveForward()
      expect(getSortedShapeIds(tlstate.data)).toBe('badc')
    })

    it('moves two adjacent siblings forward at top index', () => {
      tlstate.loadDocument(doc)
      tlstate.setSelectedIds(['c', 'd'])
      tlstate.moveForward()
      expect(getSortedShapeIds(tlstate.data)).toBe('abcd')
    })
  })

  describe('to front', () => {
    it('moves a shape to front', () => {
      tlstate.loadDocument(doc)
      tlstate.setSelectedIds(['b'])
      tlstate.moveToFront()
      expect(getSortedShapeIds(tlstate.data)).toBe('acdb')
    })

    it('moves two adjacent siblings to front', () => {
      tlstate.loadDocument(doc)
      tlstate.setSelectedIds(['a', 'b'])
      tlstate.moveToFront()
      expect(getSortedShapeIds(tlstate.data)).toBe('cdab')
    })

    it('moves two non-adjacent siblings to front', () => {
      tlstate.loadDocument(doc)
      tlstate.setSelectedIds(['a', 'c'])
      tlstate.moveToFront()
      expect(getSortedShapeIds(tlstate.data)).toBe('bdac')
    })

    it('moves siblings already at front to front', () => {
      tlstate.loadDocument(doc)
      tlstate.setSelectedIds(['c', 'd'])
      tlstate.moveToFront()
      expect(getSortedShapeIds(tlstate.data)).toBe('abcd')
    })
  })
})
