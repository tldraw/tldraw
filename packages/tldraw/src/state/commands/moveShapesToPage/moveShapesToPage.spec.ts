import { mockDocument, TldrawTestApp } from '~test'
import { ArrowShape, SessionType, TldrawShapeType } from '~types'

describe('Move to page command', () => {
  const state = new TldrawTestApp()

  beforeEach(() => {
    state.loadDocument(mockDocument).createPage('page2').changePage('page1')
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = state.state
      state.moveToPage('page2')
      const currentState = state.state

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
    state.select('rect1', 'rect2').moveToPage('page2')

    expect(state.currentPageId).toBe('page2')
    expect(state.getShape('rect1', 'page1')).toBeUndefined()
    expect(state.getShape('rect1', 'page2')).toBeDefined()
    expect(state.getShape('rect2', 'page1')).toBeUndefined()
    expect(state.getShape('rect2', 'page2')).toBeDefined()
    expect(state.selectedIds).toStrictEqual(['rect1', 'rect2'])

    state.undo()

    expect(state.getShape('rect1', 'page1')).toBeDefined()
    expect(state.getShape('rect1', 'page2')).toBeUndefined()
    expect(state.getShape('rect2', 'page1')).toBeDefined()
    expect(state.getShape('rect2', 'page2')).toBeUndefined()
    expect(state.selectedIds).toStrictEqual(['rect1', 'rect2'])
    expect(state.currentPageId).toBe('page1')

    state.redo()

    expect(state.getShape('rect1', 'page1')).toBeUndefined()
    expect(state.getShape('rect1', 'page2')).toBeDefined()
    expect(state.getShape('rect2', 'page1')).toBeUndefined()
    expect(state.getShape('rect2', 'page2')).toBeDefined()
    expect(state.selectedIds).toStrictEqual(['rect1', 'rect2'])
    expect(state.currentPageId).toBe('page2')
  })

  describe('when moving shapes with bindings', () => {
    it('deletes bindings when only the bound-to shape is moved', () => {
      state
        .selectAll()
        .delete()
        .createShapes(
          { type: TldrawShapeType.Rectangle, id: 'target1', size: [100, 100] },
          { type: TldrawShapeType.Arrow, id: 'arrow1', point: [200, 200] }
        )
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([50, 50])
        .completeSession()

      const bindingId = state.bindings[0].id
      expect(state.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)

      state.select('target1').moveToPage('page2')

      expect(state.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId).toBeUndefined()
      expect(state.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(state.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      state.undo()

      expect(state.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId).toBe(bindingId)
      expect(state.document.pages['page1'].bindings[bindingId]).toBeDefined()
      expect(state.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      state.redo()

      expect(state.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId).toBeUndefined()
      expect(state.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(state.document.pages['page2'].bindings[bindingId]).toBeUndefined()
    })

    it('deletes bindings when only the bound-from shape is moved', () => {
      state
        .selectAll()
        .delete()
        .createShapes(
          { type: TldrawShapeType.Rectangle, id: 'target1', size: [100, 100] },
          { type: TldrawShapeType.Arrow, id: 'arrow1', point: [200, 200] }
        )
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([50, 50])
        .completeSession()

      const bindingId = state.bindings[0].id
      expect(state.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)

      state.select('arrow1').moveToPage('page2')

      expect(state.getShape<ArrowShape>('arrow1', 'page2').handles.start.bindingId).toBeUndefined()
      expect(state.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(state.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      state.undo()

      expect(state.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId).toBe(bindingId)
      expect(state.document.pages['page1'].bindings[bindingId]).toBeDefined()
      expect(state.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      state.redo()

      expect(state.getShape<ArrowShape>('arrow1', 'page2').handles.start.bindingId).toBeUndefined()
      expect(state.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(state.document.pages['page2'].bindings[bindingId]).toBeUndefined()
    })

    it('moves bindings when both shapes are moved', () => {
      state
        .selectAll()
        .delete()
        .createShapes(
          { type: TldrawShapeType.Rectangle, id: 'target1', size: [100, 100] },
          { type: TldrawShapeType.Arrow, id: 'arrow1', point: [200, 200] }
        )
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([50, 50])
        .completeSession()

      const bindingId = state.bindings[0].id
      expect(state.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)

      state.select('arrow1', 'target1').moveToPage('page2')

      expect(state.getShape<ArrowShape>('arrow1', 'page2').handles.start.bindingId).toBe(bindingId)
      expect(state.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(state.document.pages['page2'].bindings[bindingId]).toBeDefined()

      state.undo()

      expect(state.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId).toBe(bindingId)
      expect(state.document.pages['page1'].bindings[bindingId]).toBeDefined()
      expect(state.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      state.redo()

      expect(state.getShape<ArrowShape>('arrow1', 'page2').handles.start.bindingId).toBe(bindingId)
      expect(state.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(state.document.pages['page2'].bindings[bindingId]).toBeDefined()
    })
  })

  describe('when moving grouped shapes', () => {
    it('moves groups and their children', () => {
      state.group(['rect1', 'rect2'], 'groupA').moveToPage('page2')

      expect(state.getShape('rect1', 'page1')).toBeUndefined()
      expect(state.getShape('rect2', 'page1')).toBeUndefined()
      expect(state.getShape('groupA', 'page1')).toBeUndefined()

      expect(state.getShape('rect1', 'page2')).toBeDefined()
      expect(state.getShape('rect2', 'page2')).toBeDefined()
      expect(state.getShape('groupA', 'page2')).toBeDefined()

      state.undo()

      expect(state.getShape('rect1', 'page2')).toBeUndefined()
      expect(state.getShape('rect2', 'page2')).toBeUndefined()
      expect(state.getShape('groupA', 'page2')).toBeUndefined()

      expect(state.getShape('rect1', 'page1')).toBeDefined()
      expect(state.getShape('rect2', 'page1')).toBeDefined()
      expect(state.getShape('groupA', 'page1')).toBeDefined()

      state.redo()

      expect(state.getShape('rect1', 'page1')).toBeUndefined()
      expect(state.getShape('rect2', 'page1')).toBeUndefined()
      expect(state.getShape('groupA', 'page1')).toBeUndefined()

      expect(state.getShape('rect1', 'page2')).toBeDefined()
      expect(state.getShape('rect2', 'page2')).toBeDefined()
      expect(state.getShape('groupA', 'page2')).toBeDefined()
    })

    it.todo('deletes groups shapes if the groups children were all moved')

    it('reparents grouped shapes if the group is not moved', () => {
      state.group(['rect1', 'rect2', 'rect3'], 'groupA').select('rect1').moveToPage('page2')

      expect(state.getShape('rect1', 'page1')).toBeUndefined()
      expect(state.getShape('rect1', 'page2')).toBeDefined()
      expect(state.getShape('rect1', 'page2').parentId).toBe('page2')
      expect(state.getShape('groupA', 'page1').children).toStrictEqual(['rect2', 'rect3'])

      state.undo()

      expect(state.getShape('rect1', 'page2')).toBeUndefined()
      expect(state.getShape('rect1', 'page1').parentId).toBe('groupA')
      expect(state.getShape('groupA', 'page1').children).toStrictEqual(['rect1', 'rect2', 'rect3'])
    })
  })

  it.todo('Does not delete uneffected bindings.')
})
