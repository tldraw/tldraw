import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { GroupShape, SessionType, TLDrawShapeType, TLDrawStatus } from '~types'

describe('Translate session', () => {
  const state = new TLDrawState()

  it('begins, updateSession', () => {
    state
      .loadDocument(mockDocument)
      .select('rect1')
      .startSession(SessionType.Translate, [5, 5])
      .updateSession([10, 10])

    expect(state.getShape('rect1').point).toStrictEqual([5, 5])

    state.completeSession()

    expect(state.appState.status).toBe(TLDrawStatus.Idle)

    expect(state.getShape('rect1').point).toStrictEqual([5, 5])

    state.undo()

    expect(state.getShape('rect1').point).toStrictEqual([0, 0])

    state.redo()

    expect(state.getShape('rect1').point).toStrictEqual([5, 5])
  })

  it('cancels session', () => {
    state
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .startSession(SessionType.Translate, [5, 5])
      .updateSession([10, 10])
      .cancelSession()

    expect(state.getShape('rect1').point).toStrictEqual([0, 0])
  })

  it('moves a single shape', () => {
    state
      .loadDocument(mockDocument)
      .select('rect1')
      .startSession(SessionType.Translate, [10, 10])
      .updateSession([20, 20])
      .completeSession()

    expect(state.getShape('rect1').point).toStrictEqual([10, 10])
  })

  it('moves a single shape along a locked axis', () => {
    state
      .loadDocument(mockDocument)
      .select('rect1')
      .startSession(SessionType.Translate, [10, 10])
      .updateSession([20, 20], true)
      .completeSession()

    expect(state.getShape('rect1').point).toStrictEqual([10, 0])
  })

  it('moves two shapes', () => {
    state
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .startSession(SessionType.Translate, [10, 10])
      .updateSession([20, 20])
      .completeSession()

    expect(state.getShape('rect1').point).toStrictEqual([10, 10])
    expect(state.getShape('rect2').point).toStrictEqual([110, 110])
  })

  it('undos and redos clones', () => {
    state
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .startSession(SessionType.Translate, [10, 10])
      .updateSession([20, 20], false, true)
      .completeSession()

    expect(state.getShape('rect1').point).toStrictEqual([0, 0])
    expect(state.getShape('rect2').point).toStrictEqual([100, 100])

    expect(Object.keys(state.getPage().shapes).length).toBe(5)

    state.undo()

    expect(Object.keys(state.getPage().shapes).length).toBe(3)

    state.redo()

    expect(Object.keys(state.getPage().shapes).length).toBe(5)
  })

  it('clones shapes', () => {
    state
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .startSession(SessionType.Translate, [10, 10])
      .updateSession([20, 20], false, true)
      .completeSession()

    expect(state.getShape('rect1').point).toStrictEqual([0, 0])
    expect(state.getShape('rect2').point).toStrictEqual([100, 100])

    expect(Object.keys(state.getPage().shapes).length).toBe(5)
  })

  it('destroys clones when last update is not cloning', () => {
    state.resetDocument().loadDocument(mockDocument)

    expect(Object.keys(state.getPage().shapes).length).toBe(3)

    state
      .select('rect1', 'rect2')
      .startSession(SessionType.Translate, [10, 10])
      .updateSession([20, 20], false, true)

    expect(Object.keys(state.getPage().shapes).length).toBe(5)

    state.updateSession([30, 30], false, false)

    expect(Object.keys(state.getPage().shapes).length).toBe(3)

    state.completeSession()

    // Original position + delta
    expect(state.getShape('rect1').point).toStrictEqual([30, 30])
    expect(state.getShape('rect2').point).toStrictEqual([130, 130])

    expect(Object.keys(state.page.shapes)).toStrictEqual(['rect1', 'rect2', 'rect3'])
  })

  it('destroys bindings from the translating shape', () => {
    state
      .loadDocument(mockDocument)
      .selectAll()
      .delete()
      .createShapes(
        {
          id: 'target1',
          type: TLDrawShapeType.Rectangle,
          parentId: 'page1',
          point: [0, 0],
          size: [100, 100],
        },
        {
          id: 'arrow1',
          type: TLDrawShapeType.Arrow,
          parentId: 'page1',
          point: [200, 200],
        }
      )
      .select('arrow1')
      .startSession(SessionType.Arrow, [200, 200], 'start')
      .updateSession([50, 50])
      .completeSession()

    expect(state.bindings.length).toBe(1)

    state
      .select('arrow1')
      .startSession(SessionType.Translate, [10, 10])
      .updateSession([30, 30])
      .completeSession()

    // expect(state.bindings.length).toBe(0)
    // expect(state.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(undefined)

    // state.undo()

    // expect(state.bindings.length).toBe(1)
    // expect(state.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBeTruthy()

    // state.redo()

    // expect(state.bindings.length).toBe(0)
    // expect(state.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(undefined)
  })

  // it.todo('clones a shape with a parent shape')

  describe('when translating a child of a group', () => {
    it('translates the shape and updates the groups size / point', () => {
      state
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group(['rect1', 'rect2'], 'groupA')
        .select('rect1')
        .startSession(SessionType.Translate, [10, 10])
        .updateSession([20, 20], false, false)
        .completeSession()

      expect(state.getShape('groupA').point).toStrictEqual([10, 10])
      expect(state.getShape('rect1').point).toStrictEqual([10, 10])
      expect(state.getShape('rect2').point).toStrictEqual([100, 100])

      state.undo()

      expect(state.getShape('groupA').point).toStrictEqual([0, 0])
      expect(state.getShape('rect1').point).toStrictEqual([0, 0])
      expect(state.getShape('rect2').point).toStrictEqual([100, 100])

      state.redo()

      expect(state.getShape('groupA').point).toStrictEqual([10, 10])
      expect(state.getShape('rect1').point).toStrictEqual([10, 10])
      expect(state.getShape('rect2').point).toStrictEqual([100, 100])
    })

    it('clones the shape and updates the parent', () => {
      state
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group(['rect1', 'rect2'], 'groupA')
        .select('rect1')
        .startSession(SessionType.Translate, [10, 10])
        .updateSession([20, 20], false, true)
        .completeSession()

      const children = state.getShape<GroupShape>('groupA').children
      const newShapeId = children[children.length - 1]

      expect(state.getShape('groupA').point).toStrictEqual([0, 0])
      expect(state.getShape<GroupShape>('groupA').children.length).toBe(3)
      expect(state.getShape('rect1').point).toStrictEqual([0, 0])
      expect(state.getShape('rect2').point).toStrictEqual([100, 100])
      expect(state.getShape(newShapeId).point).toStrictEqual([20, 20])
      expect(state.getShape(newShapeId).parentId).toBe('groupA')

      state.undo()

      expect(state.getShape('groupA').point).toStrictEqual([0, 0])
      expect(state.getShape<GroupShape>('groupA').children.length).toBe(2)
      expect(state.getShape('rect1').point).toStrictEqual([0, 0])
      expect(state.getShape('rect2').point).toStrictEqual([100, 100])
      expect(state.getShape(newShapeId)).toBeUndefined()

      state.redo()

      expect(state.getShape('groupA').point).toStrictEqual([0, 0])
      expect(state.getShape<GroupShape>('groupA').children.length).toBe(3)
      expect(state.getShape('rect1').point).toStrictEqual([0, 0])
      expect(state.getShape('rect2').point).toStrictEqual([100, 100])
      expect(state.getShape(newShapeId).point).toStrictEqual([20, 20])
      expect(state.getShape(newShapeId).parentId).toBe('groupA')
    })
  })

  describe('when translating a shape with children', () => {
    it('translates the shapes children', () => {
      state
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group(['rect1', 'rect2'], 'groupA')
        .startSession(SessionType.Translate, [10, 10])
        .updateSession([20, 20], false, false)
        .completeSession()

      expect(state.getShape('groupA').point).toStrictEqual([10, 10])
      expect(state.getShape('rect1').point).toStrictEqual([10, 10])
      expect(state.getShape('rect2').point).toStrictEqual([110, 110])

      state.undo()

      expect(state.getShape('groupA').point).toStrictEqual([0, 0])
      expect(state.getShape('rect1').point).toStrictEqual([0, 0])
      expect(state.getShape('rect2').point).toStrictEqual([100, 100])

      state.redo()

      expect(state.getShape('groupA').point).toStrictEqual([10, 10])
      expect(state.getShape('rect1').point).toStrictEqual([10, 10])
      expect(state.getShape('rect2').point).toStrictEqual([110, 110])
    })

    it('clones the shapes and children', () => {
      state
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group()
        .startSession(SessionType.Translate, [10, 10])
        .updateSession([20, 20], false, true)
        .completeSession()
    })

    it('deletes clones when not cloning anymore', () => {
      state
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group()
        .startSession(SessionType.Translate, [10, 10])
        .updateSession([20, 20], false, true)
        .updateSession([20, 20], false, false)
        .updateSession([20, 20], false, true)
        .completeSession()

      expect(state.shapes.filter((shape) => shape.type === TLDrawShapeType.Group).length).toBe(2)
    })

    it('deletes clones when not cloning anymore', () => {
      state
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group()
        .startSession(SessionType.Translate, [10, 10])
        .updateSession([20, 20], false, true)
        .updateSession([20, 20], false, false)
        .completeSession()

      expect(state.shapes.filter((shape) => shape.type === TLDrawShapeType.Group).length).toBe(1)
    })

    it('clones the shapes and children when selecting a group and a different shape', () => {
      state
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group(['rect1', 'rect2'], 'groupA')
        .select('groupA', 'rect3')
        .startSession(SessionType.Translate, [10, 10])
        .updateSession([20, 20], false, true)
        .completeSession()
    })
  })
})

describe('When creating with a translate session', () => {
  it('Deletes the shape on undo', () => {
    const state = new TLDrawState()
      .loadDocument(mockDocument)
      .select('rect1')
      .startSession(SessionType.Translate, [5, 5], true)
      .updateSession([10, 10])
      .completeSession()
      .undo()

    expect(state.getShape('rect1')).toBe(undefined)
  })
})

describe('When snapping', () => {
  it.todo('Does not snap when moving quicky')
  it.todo('Snaps only matching edges when moving slowly')
  it.todo('Snaps any edge to any edge when moving very slowly')
  it.todo('Snaps a clone to its parent')
  it.todo('Cleans up snap lines when cancelled')
  it.todo('Cleans up snap lines when completed')
  it.todo('Cleans up snap lines when starting to clone / not clone')
  it.todo('Snaps the rotated bounding box of rotated shapes')
  it.todo('Snaps to a shape on screen')
  it.todo('Does not snap to a shape off screen.')
  it.todo('Snaps while panning.')
})

describe('When translating linked shapes', () => {
  it.todo('translates all linked shapes when center is dragged')
  it.todo('translates all upstream linked shapes when left is dragged')
  it.todo('translates all downstream linked shapes when right is dragged')
})
