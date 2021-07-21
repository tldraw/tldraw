import { ShapeType } from 'types'
import TestState, { rectangleId, arrowId } from '../test-utils'

describe('delete command', () => {
  const tt = new TestState()

  describe('deleting single shapes', () => {
    it('deletes a shape and undoes the delete', () => {
      tt.deselectAll().clickShape(rectangleId).pressDelete()

      expect(tt.idsAreSelected([])).toBe(true)

      expect(tt.getShape(rectangleId)).toBe(undefined)

      tt.undo()

      expect(tt.getShape(rectangleId)).toBeTruthy()
      expect(tt.idsAreSelected([rectangleId])).toBe(true)

      tt.redo()

      expect(tt.getShape(rectangleId)).toBe(undefined)
    })
  })

  describe('deleting and restoring grouped shapes', () => {
    it('creates a group', () => {
      tt.reset()
        .deselectAll()
        .clickShape(rectangleId)
        .clickShape(arrowId, { shiftKey: true })
        .send('GROUPED')

      const group = tt.getOnlySelectedShape()

      // Should select the group
      expect(tt.assertShapeProps(group, { type: ShapeType.Group })).toBe(true)

      const arrow = tt.getShape(arrowId)

      // The arrow should be have the group as its parent
      expect(tt.assertShapeProps(arrow, { parentId: group.id })).toBe(true)
    })

    it('selects the new group', () => {
      const groupId = tt.getShape(arrowId).parentId

      expect(tt.idsAreSelected([groupId])).toBe(true)
    })

    it('assigns a new parent', () => {
      const groupId = tt.getShape(arrowId).parentId

      expect(groupId === tt.data.currentPageId).toBe(false)
    })

    // Rectangle has the same new parent?
    it('assigns new parent to all selected shapes', () => {
      const groupId = tt.getShape(arrowId).parentId

      expect(tt.hasParent(arrowId, groupId)).toBe(true)
    })
  })

  describe('selecting within the group', () => {
    it('selects the group when pointing a shape', () => {
      const groupId = tt.getShape(arrowId).parentId

      tt.deselectAll().clickShape(rectangleId)

      expect(tt.idsAreSelected([groupId])).toBe(true)
    })

    it('keeps selection when pointing group shape', () => {
      const groupId = tt.getShape(arrowId).parentId

      tt.deselectAll().clickShape(groupId)

      expect(tt.idsAreSelected([groupId])).toBe(true)
    })

    it('selects a grouped shape by double-pointing', () => {
      tt.deselectAll().doubleClickShape(rectangleId)

      expect(tt.idsAreSelected([rectangleId])).toBe(true)
    })

    it('selects a sibling on point after double-pointing into a grouped shape children', () => {
      tt.deselectAll().doubleClickShape(rectangleId).clickShape(arrowId)

      expect(tt.idsAreSelected([arrowId])).toBe(true)
    })

    it('rises up a selection level when escape is pressed', () => {
      const groupId = tt.getShape(arrowId).parentId

      tt.deselectAll().doubleClickShape(rectangleId).send('CANCELLED')

      tt.clickShape(rectangleId)

      expect(tt.idsAreSelected([groupId])).toBe(true)
    })

    // it('deletes and restores one shape', () => {
    //   // Delete the rectangle first
    //   state.send('UNDO')

    //   expect(tld.getShape(tt.data, rectangleId)).toBeTruthy()
    //   expect(tt.idsAreSelected([rectangleId])).toBe(true)

    //   state.send('REDO')

    //   expect(tld.getShape(tt.data, rectangleId)).toBe(undefined)

    //   state.send('UNDO')

    //   expect(tld.getShape(tt.data, rectangleId)).toBeTruthy()
    //   expect(tt.idsAreSelected([rectangleId])).toBe(true)
  })
})
