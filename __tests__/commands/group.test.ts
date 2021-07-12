import { ShapeType } from 'types'
import TestState from '../test-utils'

describe('group command', () => {
  const tt = new TestState()
  tt.resetDocumentState()
    .createShape(
      {
        type: ShapeType.Rectangle,
        point: [0, 0],
        size: [100, 100],
        childIndex: 1,
        isLocked: false,
        isHidden: false,
        isAspectRatioLocked: false,
      },
      'rect1'
    )
    .createShape(
      {
        type: ShapeType.Rectangle,
        point: [400, 0],
        size: [100, 100],
        childIndex: 2,
        isHidden: false,
        isLocked: false,
        isAspectRatioLocked: false,
      },
      'rect2'
    )
    .save()

  // it('deletes the group if it has only one child', () => {
  //   tt.restore()
  //     .clickShape('rect1')
  //     .clickShape('rect2', { shiftKey: true })
  //     .send('GROUPED')

  //   const groupId = tt.getShape('rect1').parentId

  //   expect(groupId === tt.data.currentPageId).toBe(false)

  //   tt.doubleClickShape('rect1')

  //   tt.send('DELETED')

  //   expect(tt.getShape(groupId)).toBe(undefined)
  //   expect(tt.getShape('rect2')).toBeTruthy()
  // })

  it('deletes the group if all children are deleted', () => {
    tt.restore()
      .clickShape('rect1')
      .clickShape('rect2', { shiftKey: true })
      .send('GROUPED')

    const groupId = tt.getShape('rect1').parentId

    expect(groupId === tt.data.currentPageId).toBe(false)

    tt.doubleClickShape('rect1').clickShape('rect2', { shiftKey: true })

    tt.send('DELETED')

    expect(tt.getShape(groupId)).toBe(undefined)
  })

  it('creates a group', () => {
    tt.restore()
      .clickShape('rect1')
      .clickShape('rect2', { shiftKey: true })
      .send('GROUPED')

    const groupId = tt.getShape('rect1').parentId

    expect(groupId === tt.data.currentPageId).toBe(false)
  })

  it('selects the group on single click', () => {
    tt.restore()
      .clickShape('rect1')
      .clickShape('rect2', { shiftKey: true })
      .send('GROUPED')
      .clickShape('rect1')

    const groupId = tt.getShape('rect1').parentId

    expect(tt.selectedIds).toEqual([groupId])
  })

  it('selects the item on double click', () => {
    tt.restore()
      .clickShape('rect1')
      .clickShape('rect2', { shiftKey: true })
      .send('GROUPED')
      .doubleClickShape('rect1')

    const groupId = tt.getShape('rect1').parentId

    expect(tt.data.currentParentId).toBe(groupId)

    expect(tt.selectedIds).toEqual(['rect1'])
  })

  it('resets currentPageId when clicking the canvas', () => {
    tt.restore()
      .clickShape('rect1')
      .clickShape('rect2', { shiftKey: true })
      .send('GROUPED')
      .doubleClickShape('rect1')
      .clickCanvas()
      .clickShape('rect1')

    const groupId = tt.getShape('rect1').parentId

    expect(tt.data.currentParentId).toBe(tt.data.currentPageId)

    expect(tt.selectedIds).toEqual([groupId])
  })

  it('creates a group and undoes and redoes', () => {
    tt.restore()
      .clickShape('rect1')
      .clickShape('rect2', { shiftKey: true })
      .send('GROUPED')

    const groupId = tt.getShape('rect1').parentId

    expect(groupId === tt.data.currentPageId).toBe(false)

    tt.undo()

    expect(tt.getShape('rect1').parentId === tt.data.currentPageId).toBe(true)
    expect(tt.getShape(groupId)).toBe(undefined)

    tt.redo()

    expect(tt.getShape('rect1').parentId === tt.data.currentPageId).toBe(false)
    expect(tt.getShape(groupId)).toBeTruthy()
  })

  it('groups shapes with different parents', () => {
    // TODO
    null
  })

  it('does not group a parent group shape and its child', () => {
    // TODO
    null
  })
})
