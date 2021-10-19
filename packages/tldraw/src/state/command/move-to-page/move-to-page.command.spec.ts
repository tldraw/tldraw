import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { ArrowShape, SessionType, TLDrawShapeType } from '~types'

describe('Move to page command', () => {
  const tlstate = new TLDrawState()

  beforeEach(() => {
    tlstate.loadDocument(mockDocument).createPage('page2').changePage('page1')
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = tlstate.state
      tlstate.moveToPage('page2')
      const currentState = tlstate.state

      expect(currentState).toEqual(initialState)
    })
  })

  /*
  Moving shapes to a new page should remove those shapes from the
  current page and add them to the specified page. If bindings exist
  that effect the moved shapes, then the bindings should be destroyed
  on the old page and created on the new page only if both the "to"
  and "from" shapes were moved. The app should then change pages to
  the new page.
  */

  it('does, undoes and redoes command', () => {
    tlstate.select('rect1', 'rect2').moveToPage('page2')

    expect(tlstate.currentPageId).toBe('page2')
    expect(tlstate.getShape('rect1', 'page1')).toBeUndefined()
    expect(tlstate.getShape('rect1', 'page2')).toBeDefined()
    expect(tlstate.getShape('rect2', 'page1')).toBeUndefined()
    expect(tlstate.getShape('rect2', 'page2')).toBeDefined()
    expect(tlstate.selectedIds).toStrictEqual(['rect1', 'rect2'])

    tlstate.undo()

    expect(tlstate.getShape('rect1', 'page1')).toBeDefined()
    expect(tlstate.getShape('rect1', 'page2')).toBeUndefined()
    expect(tlstate.getShape('rect2', 'page1')).toBeDefined()
    expect(tlstate.getShape('rect2', 'page2')).toBeUndefined()
    expect(tlstate.selectedIds).toStrictEqual(['rect1', 'rect2'])
    expect(tlstate.currentPageId).toBe('page1')

    tlstate.redo()

    expect(tlstate.getShape('rect1', 'page1')).toBeUndefined()
    expect(tlstate.getShape('rect1', 'page2')).toBeDefined()
    expect(tlstate.getShape('rect2', 'page1')).toBeUndefined()
    expect(tlstate.getShape('rect2', 'page2')).toBeDefined()
    expect(tlstate.selectedIds).toStrictEqual(['rect1', 'rect2'])
    expect(tlstate.currentPageId).toBe('page2')
  })

  describe('when moving shapes with bindings', () => {
    it('deletes bindings when only the bound-to shape is moved', () => {
      tlstate
        .selectAll()
        .delete()
        .createShapes(
          { type: TLDrawShapeType.Rectangle, id: 'target1', size: [100, 100] },
          { type: TLDrawShapeType.Arrow, id: 'arrow1', point: [200, 200] }
        )
        .select('arrow1')
        .startSession(SessionType.Arrow, [200, 200], 'start')
        .updateSession([50, 50])
        .completeSession()

      const bindingId = tlstate.bindings[0].id
      expect(tlstate.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)

      tlstate.select('target1').moveToPage('page2')

      expect(
        tlstate.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId
      ).toBeUndefined()
      expect(tlstate.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(tlstate.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      tlstate.undo()

      expect(tlstate.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId).toBe(
        bindingId
      )
      expect(tlstate.document.pages['page1'].bindings[bindingId]).toBeDefined()
      expect(tlstate.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      tlstate.redo()

      expect(
        tlstate.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId
      ).toBeUndefined()
      expect(tlstate.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(tlstate.document.pages['page2'].bindings[bindingId]).toBeUndefined()
    })

    it('deletes bindings when only the bound-from shape is moved', () => {
      tlstate
        .selectAll()
        .delete()
        .createShapes(
          { type: TLDrawShapeType.Rectangle, id: 'target1', size: [100, 100] },
          { type: TLDrawShapeType.Arrow, id: 'arrow1', point: [200, 200] }
        )
        .select('arrow1')
        .startSession(SessionType.Arrow, [200, 200], 'start')
        .updateSession([50, 50])
        .completeSession()

      const bindingId = tlstate.bindings[0].id
      expect(tlstate.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)

      tlstate.select('arrow1').moveToPage('page2')

      expect(
        tlstate.getShape<ArrowShape>('arrow1', 'page2').handles.start.bindingId
      ).toBeUndefined()
      expect(tlstate.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(tlstate.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      tlstate.undo()

      expect(tlstate.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId).toBe(
        bindingId
      )
      expect(tlstate.document.pages['page1'].bindings[bindingId]).toBeDefined()
      expect(tlstate.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      tlstate.redo()

      expect(
        tlstate.getShape<ArrowShape>('arrow1', 'page2').handles.start.bindingId
      ).toBeUndefined()
      expect(tlstate.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(tlstate.document.pages['page2'].bindings[bindingId]).toBeUndefined()
    })

    it('moves bindings when both shapes are moved', () => {
      tlstate
        .selectAll()
        .delete()
        .createShapes(
          { type: TLDrawShapeType.Rectangle, id: 'target1', size: [100, 100] },
          { type: TLDrawShapeType.Arrow, id: 'arrow1', point: [200, 200] }
        )
        .select('arrow1')
        .startSession(SessionType.Arrow, [200, 200], 'start')
        .updateSession([50, 50])
        .completeSession()

      const bindingId = tlstate.bindings[0].id
      expect(tlstate.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)

      tlstate.select('arrow1', 'target1').moveToPage('page2')

      expect(tlstate.getShape<ArrowShape>('arrow1', 'page2').handles.start.bindingId).toBe(
        bindingId
      )
      expect(tlstate.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(tlstate.document.pages['page2'].bindings[bindingId]).toBeDefined()

      tlstate.undo()

      expect(tlstate.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId).toBe(
        bindingId
      )
      expect(tlstate.document.pages['page1'].bindings[bindingId]).toBeDefined()
      expect(tlstate.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      tlstate.redo()

      expect(tlstate.getShape<ArrowShape>('arrow1', 'page2').handles.start.bindingId).toBe(
        bindingId
      )
      expect(tlstate.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(tlstate.document.pages['page2'].bindings[bindingId]).toBeDefined()
    })
  })

  describe('when moving grouped shapes', () => {
    it('moves groups and their children', () => {
      tlstate.group(['rect1', 'rect2'], 'groupA').moveToPage('page2')

      expect(tlstate.getShape('rect1', 'page1')).toBeUndefined()
      expect(tlstate.getShape('rect2', 'page1')).toBeUndefined()
      expect(tlstate.getShape('groupA', 'page1')).toBeUndefined()

      expect(tlstate.getShape('rect1', 'page2')).toBeDefined()
      expect(tlstate.getShape('rect2', 'page2')).toBeDefined()
      expect(tlstate.getShape('groupA', 'page2')).toBeDefined()

      tlstate.undo()

      expect(tlstate.getShape('rect1', 'page2')).toBeUndefined()
      expect(tlstate.getShape('rect2', 'page2')).toBeUndefined()
      expect(tlstate.getShape('groupA', 'page2')).toBeUndefined()

      expect(tlstate.getShape('rect1', 'page1')).toBeDefined()
      expect(tlstate.getShape('rect2', 'page1')).toBeDefined()
      expect(tlstate.getShape('groupA', 'page1')).toBeDefined()

      tlstate.redo()

      expect(tlstate.getShape('rect1', 'page1')).toBeUndefined()
      expect(tlstate.getShape('rect2', 'page1')).toBeUndefined()
      expect(tlstate.getShape('groupA', 'page1')).toBeUndefined()

      expect(tlstate.getShape('rect1', 'page2')).toBeDefined()
      expect(tlstate.getShape('rect2', 'page2')).toBeDefined()
      expect(tlstate.getShape('groupA', 'page2')).toBeDefined()
    })

    it.todo('deletes groups shapes if the groups children were all moved')

    it('reparents grouped shapes if the group is not moved', () => {
      tlstate.group(['rect1', 'rect2', 'rect3'], 'groupA').select('rect1').moveToPage('page2')

      expect(tlstate.getShape('rect1', 'page1')).toBeUndefined()
      expect(tlstate.getShape('rect1', 'page2')).toBeDefined()
      expect(tlstate.getShape('rect1', 'page2').parentId).toBe('page2')
      expect(tlstate.getShape('groupA', 'page1').children).toStrictEqual(['rect2', 'rect3'])

      tlstate.undo()

      expect(tlstate.getShape('rect1', 'page2')).toBeUndefined()
      expect(tlstate.getShape('rect1', 'page1').parentId).toBe('groupA')
      expect(tlstate.getShape('groupA', 'page1').children).toStrictEqual([
        'rect1',
        'rect2',
        'rect3',
      ])
    })
  })

  it.todo('Does not delete uneffected bindings.')
})
