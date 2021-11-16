/* eslint-disable @typescript-eslint/ban-ts-comment */
import { mockDocument, TldrawTestApp } from '~test'
import { GroupShape, TldrawShape, TldrawShapeType } from '~types'

describe('Group command', () => {
  const state = new TldrawTestApp()

  beforeEach(() => {
    state.loadDocument(mockDocument)
  })

  it('does, undoes and redoes command', () => {
    state.group(['rect1', 'rect2'], 'newGroup')

    expect(state.getShape<GroupShape>('newGroup')).toBeTruthy()

    state.undo()

    expect(state.getShape<GroupShape>('newGroup')).toBeUndefined()

    state.redo()

    expect(state.getShape<GroupShape>('newGroup')).toBeTruthy()
  })

  describe('when less than two shapes are selected', () => {
    it('does nothing', () => {
      state.selectNone()

      // @ts-ignore
      const stackLength = state.stack.length

      state.group([], 'newGroup')
      expect(state.getShape<GroupShape>('newGroup')).toBeUndefined()
      // @ts-ignore
      expect(state.stack.length).toBe(stackLength)

      state.group(['rect1'], 'newGroup')
      expect(state.getShape<GroupShape>('newGroup')).toBeUndefined()
      // @ts-ignore
      expect(state.stack.length).toBe(stackLength)
    })
  })

  describe('when grouping shapes on the page', () => {
    /*
    When the parent is a page, the group is created as a child of the page
    and the shapes are reparented to the group. The group's child
    index should be the minimum child index of the selected shapes.
    */

    it('creates a group with the correct props', () => {
      state.updateShapes(
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

      state.group(['rect1', 'rect2'], 'newGroup')
      const group = state.getShape<GroupShape>('newGroup')
      expect(group).toBeTruthy()
      expect(group.parentId).toBe('page1')
      expect(group.childIndex).toBe(3)
      expect(group.point).toStrictEqual([20, 20])
      expect(group.children).toStrictEqual(['rect1', 'rect2'])
    })

    it('reparents the grouped shapes', () => {
      state.updateShapes(
        {
          id: 'rect1',
          childIndex: 2.5,
        },
        {
          id: 'rect2',
          childIndex: 4.7,
        }
      )

      state.group(['rect1', 'rect2'], 'newGroup')

      let rect1: TldrawShape
      let rect2: TldrawShape

      rect1 = state.getShape('rect1')
      rect2 = state.getShape('rect2')
      // Reparents the shapes
      expect(rect1.parentId).toBe('newGroup')
      expect(rect2.parentId).toBe('newGroup')
      // Sets and preserves the order of the grouped shapes
      expect(rect1.childIndex).toBe(1)
      expect(rect2.childIndex).toBe(2)

      state.undo()

      rect1 = state.getShape('rect1')
      rect2 = state.getShape('rect2')
      // Restores the shapes' parentIds
      expect(rect1.parentId).toBe('page1')
      expect(rect2.parentId).toBe('page1')
      // Restores the shapes' childIndexs
      expect(rect1.childIndex).toBe(2.5)
      expect(rect2.childIndex).toBe(4.7)
    })
  })

  describe('when grouping shapes that already belong to a group', () => {
    /*
    Do not allow groups to nest. All groups should be children of
    the page: a group should never be the child of a different group.
    This is a UX decision as much as a technical one.
    */

    it('creates a new group on the page', () => {
      /*
      When the selected shapes are the children of another group, and so
      long as the children do not represent ALL of the group's children,
      then a new group should be created from the selected shapes and the
      original group be updated to only contain the remaining ones.
      */

      state.resetDocument().createShapes(
        {
          id: 'rect1',
          type: TldrawShapeType.Rectangle,
          childIndex: 1,
        },
        {
          id: 'rect2',
          type: TldrawShapeType.Rectangle,
          childIndex: 2,
        },
        {
          id: 'rect3',
          type: TldrawShapeType.Rectangle,
          childIndex: 3,
        },
        {
          id: 'rect4',
          type: TldrawShapeType.Rectangle,
          childIndex: 4,
        }
      )

      state.group(['rect1', 'rect2', 'rect3', 'rect4'], 'newGroupA')

      expect(state.getShape<GroupShape>('newGroupA')).toBeTruthy()
      expect(state.getShape('rect1').childIndex).toBe(1)
      expect(state.getShape('rect2').childIndex).toBe(2)
      expect(state.getShape('rect3').childIndex).toBe(3)
      expect(state.getShape('rect4').childIndex).toBe(4)
      expect(state.getShape<GroupShape>('newGroupA').children).toStrictEqual([
        'rect1',
        'rect2',
        'rect3',
        'rect4',
      ])

      state.group(['rect1', 'rect3'], 'newGroupB')

      expect(state.getShape<GroupShape>('newGroupA')).toBeTruthy()
      expect(state.getShape('rect2').childIndex).toBe(2)
      expect(state.getShape('rect4').childIndex).toBe(4)
      expect(state.getShape<GroupShape>('newGroupA').children).toStrictEqual(['rect2', 'rect4'])

      expect(state.getShape<GroupShape>('newGroupB')).toBeTruthy()
      expect(state.getShape('rect1').childIndex).toBe(1)
      expect(state.getShape('rect3').childIndex).toBe(2)
      expect(state.getShape<GroupShape>('newGroupB').children).toStrictEqual(['rect1', 'rect3'])

      state.undo()

      expect(state.getShape<GroupShape>('newGroupA')).toBeTruthy()
      expect(state.getShape('rect1').childIndex).toBe(1)
      expect(state.getShape('rect2').childIndex).toBe(2)
      expect(state.getShape('rect3').childIndex).toBe(3)
      expect(state.getShape('rect4').childIndex).toBe(4)
      expect(state.getShape<GroupShape>('newGroupA').children).toStrictEqual([
        'rect1',
        'rect2',
        'rect3',
        'rect4',
      ])

      expect(state.getShape<GroupShape>('newGroupB')).toBeUndefined()

      state.redo()

      expect(state.getShape<GroupShape>('newGroupA')).toBeTruthy()
      expect(state.getShape('rect2').childIndex).toBe(2)
      expect(state.getShape('rect4').childIndex).toBe(4)
      expect(state.getShape<GroupShape>('newGroupA').children).toStrictEqual(['rect2', 'rect4'])

      expect(state.getShape<GroupShape>('newGroupB')).toBeTruthy()
      expect(state.getShape('rect1').childIndex).toBe(1)
      expect(state.getShape('rect3').childIndex).toBe(2)
      expect(state.getShape<GroupShape>('newGroupB').children).toStrictEqual(['rect1', 'rect3'])
    })

    it('does nothing if all shapes in the group are selected', () => {
      /*
      If the selected shapes represent ALL of the children of the a
      group, then no effect should occur.
      */
      state.resetDocument().createShapes(
        {
          id: 'rect1',
          type: TldrawShapeType.Rectangle,
          childIndex: 1,
        },
        {
          id: 'rect2',
          type: TldrawShapeType.Rectangle,
          childIndex: 2,
        },
        {
          id: 'rect3',
          type: TldrawShapeType.Rectangle,
          childIndex: 3,
        }
      )

      state.group(['rect1', 'rect2', 'rect3'], 'newGroupA')
      state.group(['rect1', 'rect2', 'rect3'], 'newGroupB')
      expect(state.getShape<GroupShape>('newGroupB')).toBeUndefined()
    })

    it('deletes any groups that no longer have children', () => {
      /*
      If the selected groups included the children of another group
      in addition to other shapes then that group should be destroyed.
      Other rules around deleted shapes should here apply: bindings
      connected to the group should be deleted, etc.
      */
      state.resetDocument().createShapes(
        {
          id: 'rect1',
          type: TldrawShapeType.Rectangle,
          childIndex: 1,
        },
        {
          id: 'rect2',
          type: TldrawShapeType.Rectangle,
          childIndex: 2,
        },
        {
          id: 'rect3',
          type: TldrawShapeType.Rectangle,
          childIndex: 3,
        }
      )

      state.group(['rect1', 'rect2'], 'newGroupA')
      state.group(['rect1', 'rect2', 'rect3'], 'newGroupB')
      expect(state.getShape<GroupShape>('newGroupA')).toBeUndefined()
      expect(state.getShape<GroupShape>('newGroupB').children).toStrictEqual([
        'rect1',
        'rect2',
        'rect3',
      ])
    })

    it('merges selected groups that no longer have children', () => {
      /*
      If the user is creating a group while having selected other
      groups, then the selected groups should be destroyed and a new
      group created with the selected shapes and the group(s)' children.
      */
      state.resetDocument().createShapes(
        {
          id: 'rect1',
          type: TldrawShapeType.Rectangle,
          childIndex: 1,
        },
        {
          id: 'rect2',
          type: TldrawShapeType.Rectangle,
          childIndex: 2,
        },
        {
          id: 'rect3',
          type: TldrawShapeType.Rectangle,
          childIndex: 3,
        }
      )

      state.group(['rect1', 'rect2'], 'newGroupA')
      state.group(['newGroupA', 'rect3'], 'newGroupB')
      expect(state.getShape<GroupShape>('newGroupA')).toBeUndefined()
      expect(state.getShape<GroupShape>('newGroupB').children).toStrictEqual([
        'rect1',
        'rect2',
        'rect3',
      ])

      state.undo()

      expect(state.getShape<GroupShape>('newGroupB')).toBeUndefined()
      expect(state.getShape<GroupShape>('newGroupA')).toBeDefined()
      expect(state.getShape<GroupShape>('newGroupA').children).toStrictEqual(['rect1', 'rect2'])

      state.redo()

      expect(state.getShape<GroupShape>('newGroupA')).toBeUndefined()
      expect(state.getShape<GroupShape>('newGroupB')).toBeDefined()
      expect(state.getShape<GroupShape>('newGroupB').children).toStrictEqual([
        'rect1',
        'rect2',
        'rect3',
      ])
    })

    it('Ungroups if the only shape selected is a group', () => {
      state.resetDocument().createShapes(
        {
          id: 'rect1',
          type: TldrawShapeType.Rectangle,
          childIndex: 1,
        },
        {
          id: 'rect2',
          type: TldrawShapeType.Rectangle,
          childIndex: 2,
        },
        {
          id: 'rect3',
          type: TldrawShapeType.Rectangle,
          childIndex: 3,
        }
      )

      expect(state.shapes.length).toBe(3)

      state.selectAll().group()

      expect(state.shapes.length).toBe(4)

      state.selectAll().group()

      expect(state.shapes.length).toBe(3)
    })

    /*
      The layers should be in the same order as the original layers as
      they would have appeared on a layers tree (lowest child index
      first, parent inclusive).
      */

    it.todo('preserves the child index order')

    /* --------------------- Nesting -------------------- */

    // it.todo('creates the new group as a child of the parent group')
    /*
      The new group should be a child of the parent group.
      */

    // it.todo('moves the selected layers to the new group')
    /*
      The new group should have the selected children. The old parents
      should no longer have the selected shapes among their children.
      All of the selected shapes should be assigned the new parent.
      */
  })

  // describe('when grouping shapes with different parents', () => {
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

  // it.todo('creates a group in the correct place')
  /*
      The new group should be a child of the nearest shape to the top
      of the tree.
      */

  /*
      If the selected groups included the children of another group, then
      that group should be destroyed. Other rules around deleted
      shapes should here apply: bindings connected to the group
      should be deleted, etc.
      */

  // it.todo('deletes any groups that no longer have children')

  // })
})
