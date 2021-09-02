/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import type { GroupShape, TLDrawShape } from '~types'

describe('Group command', () => {
  const tlstate = new TLDrawState()

  it('does, undoes and redoes command', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.group(['rect1', 'rect2'], 'newGroup')

    expect(tlstate.getShape<GroupShape>('newGroup')).toBeTruthy()

    tlstate.undo()

    expect(tlstate.getShape<GroupShape>('newGroup')).toBeUndefined()

    tlstate.redo()

    expect(tlstate.getShape<GroupShape>('newGroup')).toBeTruthy()
  })

  describe('when less than two shapes are selected', () => {
    it('does nothing', () => {
      tlstate.loadDocument(mockDocument)
      tlstate.deselectAll()

      // @ts-ignore
      const stackLength = tlstate.stack.length

      tlstate.group([], 'newGroup')
      expect(tlstate.getShape<GroupShape>('newGroup')).toBeUndefined()
      // @ts-ignore
      expect(tlstate.stack.length).toBe(stackLength)

      tlstate.group(['rect1'], 'newGroup')
      expect(tlstate.getShape<GroupShape>('newGroup')).toBeUndefined()
      // @ts-ignore
      expect(tlstate.stack.length).toBe(stackLength)
    })
  })

  describe('when grouping shapes on the page', () => {
    /*
    When the parent is a page, the group is created as a child of the page
    and the shapes are reparented to the group. The group's child
    index should be the minimum child index of the selected shapes.
    */

    it('creates a group with the correct props', () => {
      tlstate.loadDocument(mockDocument)

      tlstate.updateShapes(
        {
          id: 'rect1',
          point: [300, 300],
          childIndex: 3,
        },
        {
          id: 'rect2',
          point: [20, 20],
          childIndex: 4,
        }
      )

      tlstate.group(['rect1', 'rect2'], 'newGroup')
      const group = tlstate.getShape<GroupShape>('newGroup')
      expect(group).toBeTruthy()
      expect(group.parentId).toBe('page1')
      expect(group.childIndex).toBe(3)
      expect(group.point).toStrictEqual([20, 20])
      expect(group.children).toStrictEqual(['rect1', 'rect2'])
    })

    it('reparents the grouped shapes', () => {
      tlstate.loadDocument(mockDocument)

      tlstate.updateShapes(
        {
          id: 'rect1',
          childIndex: 2.5,
        },
        {
          id: 'rect2',
          childIndex: 4.7,
        }
      )

      tlstate.group(['rect1', 'rect2'], 'newGroup')

      let rect1: TLDrawShape
      let rect2: TLDrawShape

      rect1 = tlstate.getShape('rect1')
      rect2 = tlstate.getShape('rect2')
      // Reparents the shapes
      expect(rect1.parentId).toBe('newGroup')
      expect(rect2.parentId).toBe('newGroup')
      // Sets and preserves the order of the grouped shapes
      expect(rect1.childIndex).toBe(1)
      expect(rect2.childIndex).toBe(2)

      tlstate.undo()

      rect1 = tlstate.getShape('rect1')
      rect2 = tlstate.getShape('rect2')
      // Restores the shapes' parentIds
      expect(rect1.parentId).toBe('page1')
      expect(rect2.parentId).toBe('page1')
      // Restores the shapes' childIndexs
      expect(rect1.childIndex).toBe(2.5)
      expect(rect2.childIndex).toBe(4.7)
    })
  })

  describe('when grouping shapes that are the child of another group', () => {
    /*
    When the selected shapes are the children of another group, and so
    long as the children do not represent ALL of the group's children,
    then a new group should be created that is a child of the parent group.
    */

    it.todo('does not group shapes if shapes are all the groups children')
    /*
      If the selected shapes represent ALL of the children of the a
      group, then no effect should occur.
      */

    it.todo('creates the new group as a child of the parent group')
    /*
      The new group should be a child of the parent group.
      */

    it('moves the selected layers to the new group', () => {
      /*
      The new group should have the selected children. The old parents
      should no longer have the selected shapes among their children.
      All of the selected shapes should be assigned the new parent.
      */
    })

    it.todo('deletes any groups that no longer have children')
    /*
      If the selected groups included the children of another group, then
      that group should be destroyed. Other rules around deleted
      shapes should here apply: bindings connected to the group
      should be deleted, etc.
      */

    it.todo('preserves the child index order')
    /*
      The layers should be in the same order as the original layers as
      they would have appeared on a layers tree (lowest child index
      first, parent inclusive).
      */
  })

  describe('when grouping shapes with different parents', () => {
    /* 
    When two shapes with different parents are grouped, the new parent
    group should have the same parent as the shape nearest to the top
    of the layer tree. The new group's child index should be that
    shape's child index.

    For example, if the shapes are grouped in the following order:

    - page1 
      - group1
        - arrow1
        - rect1 (x)
      - arrow2
      - rect2 (x)

    The new parent group should have the same parent as rect1.

    - page1 
      - group1
        - arrow1
        - group2
          - rect1 (x)
          - rect2 (x)
      - arrow2

    If, instead, the shapes are grouped in the following order:

    - page1 
      - arrow1
      - rect1 (x)
      - group1
        - arrow2
        - rect2 (x)

    Then the new parent group should have the same parent as
    rect2.
    
    - page1 
      - arrow1
      - group2 (x)
        - rect1 
        - rect2 
      - group1
        - arrow2

    We can find this by searching the tree for the nearest shape to
    the top.
    */

    it.todo('creates a group in the correct place')
    /*
      The new group should be a child of the nearest shape to the top
      of the tree.
      */
  })
})
