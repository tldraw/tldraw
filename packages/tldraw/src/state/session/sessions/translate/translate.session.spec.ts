import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { GroupShape, SessionType, TLDrawShapeType, TLDrawStatus } from '~types'

describe('Translate session', () => {
  const tlstate = new TLDrawState()

  it('begins, updateSession', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1')
      .startSession(SessionType.Translate, [5, 5])
      .updateSession([10, 10])

    expect(tlstate.getShape('rect1').point).toStrictEqual([5, 5])

    tlstate.completeSession()

    expect(tlstate.appState.status).toBe(TLDrawStatus.Idle)

    expect(tlstate.getShape('rect1').point).toStrictEqual([5, 5])

    tlstate.undo()

    expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])

    tlstate.redo()

    expect(tlstate.getShape('rect1').point).toStrictEqual([5, 5])
  })

  it('cancels session', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .startSession(SessionType.Translate, [5, 5])
      .updateSession([10, 10])
      .cancelSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])
  })

  it('moves a single shape', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1')
      .startSession(SessionType.Translate, [10, 10])
      .updateSession([20, 20])
      .completeSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([10, 10])
  })

  it('moves a single shape along a locked axis', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1')
      .startSession(SessionType.Translate, [10, 10])
      .updateSession([20, 20], true)
      .completeSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([10, 0])
  })

  it('moves two shapes', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .startSession(SessionType.Translate, [10, 10])
      .updateSession([20, 20])
      .completeSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([10, 10])
    expect(tlstate.getShape('rect2').point).toStrictEqual([110, 110])
  })

  it('undos and redos clones', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .startSession(SessionType.Translate, [10, 10])
      .updateSession([20, 20], false, true)
      .completeSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])
    expect(tlstate.getShape('rect2').point).toStrictEqual([100, 100])

    expect(Object.keys(tlstate.getPage().shapes).length).toBe(5)

    tlstate.undo()

    expect(Object.keys(tlstate.getPage().shapes).length).toBe(3)

    tlstate.redo()

    expect(Object.keys(tlstate.getPage().shapes).length).toBe(5)
  })

  it('clones shapes', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .startSession(SessionType.Translate, [10, 10])
      .updateSession([20, 20], false, true)
      .completeSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])
    expect(tlstate.getShape('rect2').point).toStrictEqual([100, 100])

    expect(Object.keys(tlstate.getPage().shapes).length).toBe(5)
  })

  it('destroys clones when last update is not cloning', () => {
    tlstate.resetDocument().loadDocument(mockDocument)

    expect(Object.keys(tlstate.getPage().shapes).length).toBe(3)

    tlstate
      .select('rect1', 'rect2')
      .startSession(SessionType.Translate, [10, 10])
      .updateSession([20, 20], false, true)

    expect(Object.keys(tlstate.getPage().shapes).length).toBe(5)

    tlstate.updateSession([30, 30], false, false)

    expect(Object.keys(tlstate.getPage().shapes).length).toBe(3)

    tlstate.completeSession()

    // Original position + delta
    expect(tlstate.getShape('rect1').point).toStrictEqual([30, 30])
    expect(tlstate.getShape('rect2').point).toStrictEqual([130, 130])

    expect(Object.keys(tlstate.page.shapes)).toStrictEqual(['rect1', 'rect2', 'rect3'])
  })

  it('destroys bindings from the translating shape', () => {
    tlstate
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

    expect(tlstate.bindings.length).toBe(1)

    tlstate
      .select('arrow1')
      .startSession(SessionType.Translate, [10, 10])
      .updateSession([30, 30])
      .completeSession()

    // expect(tlstate.bindings.length).toBe(0)
    // expect(tlstate.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(undefined)

    // tlstate.undo()

    // expect(tlstate.bindings.length).toBe(1)
    // expect(tlstate.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBeTruthy()

    // tlstate.redo()

    // expect(tlstate.bindings.length).toBe(0)
    // expect(tlstate.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(undefined)
  })

  // it.todo('clones a shape with a parent shape')

  describe('when translating a child of a group', () => {
    it('translates the shape and updates the groups size / point', () => {
      tlstate
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group(['rect1', 'rect2'], 'groupA')
        .select('rect1')
        .startSession(SessionType.Translate, [10, 10])
        .updateSession([20, 20], false, false)
        .completeSession()

      expect(tlstate.getShape('groupA').point).toStrictEqual([10, 10])
      expect(tlstate.getShape('rect1').point).toStrictEqual([10, 10])
      expect(tlstate.getShape('rect2').point).toStrictEqual([100, 100])

      tlstate.undo()

      expect(tlstate.getShape('groupA').point).toStrictEqual([0, 0])
      expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])
      expect(tlstate.getShape('rect2').point).toStrictEqual([100, 100])

      tlstate.redo()

      expect(tlstate.getShape('groupA').point).toStrictEqual([10, 10])
      expect(tlstate.getShape('rect1').point).toStrictEqual([10, 10])
      expect(tlstate.getShape('rect2').point).toStrictEqual([100, 100])
    })

    it('clones the shape and updates the parent', () => {
      tlstate
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group(['rect1', 'rect2'], 'groupA')
        .select('rect1')
        .startSession(SessionType.Translate, [10, 10])
        .updateSession([20, 20], false, true)
        .completeSession()

      const children = tlstate.getShape<GroupShape>('groupA').children
      const newShapeId = children[children.length - 1]

      expect(tlstate.getShape('groupA').point).toStrictEqual([0, 0])
      expect(tlstate.getShape<GroupShape>('groupA').children.length).toBe(3)
      expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])
      expect(tlstate.getShape('rect2').point).toStrictEqual([100, 100])
      expect(tlstate.getShape(newShapeId).point).toStrictEqual([20, 20])
      expect(tlstate.getShape(newShapeId).parentId).toBe('groupA')

      tlstate.undo()

      expect(tlstate.getShape('groupA').point).toStrictEqual([0, 0])
      expect(tlstate.getShape<GroupShape>('groupA').children.length).toBe(2)
      expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])
      expect(tlstate.getShape('rect2').point).toStrictEqual([100, 100])
      expect(tlstate.getShape(newShapeId)).toBeUndefined()

      tlstate.redo()

      expect(tlstate.getShape('groupA').point).toStrictEqual([0, 0])
      expect(tlstate.getShape<GroupShape>('groupA').children.length).toBe(3)
      expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])
      expect(tlstate.getShape('rect2').point).toStrictEqual([100, 100])
      expect(tlstate.getShape(newShapeId).point).toStrictEqual([20, 20])
      expect(tlstate.getShape(newShapeId).parentId).toBe('groupA')
    })
  })

  describe('when translating a shape with children', () => {
    it('translates the shapes children', () => {
      tlstate
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group(['rect1', 'rect2'], 'groupA')
        .startSession(SessionType.Translate, [10, 10])
        .updateSession([20, 20], false, false)
        .completeSession()

      expect(tlstate.getShape('groupA').point).toStrictEqual([10, 10])
      expect(tlstate.getShape('rect1').point).toStrictEqual([10, 10])
      expect(tlstate.getShape('rect2').point).toStrictEqual([110, 110])

      tlstate.undo()

      expect(tlstate.getShape('groupA').point).toStrictEqual([0, 0])
      expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])
      expect(tlstate.getShape('rect2').point).toStrictEqual([100, 100])

      tlstate.redo()

      expect(tlstate.getShape('groupA').point).toStrictEqual([10, 10])
      expect(tlstate.getShape('rect1').point).toStrictEqual([10, 10])
      expect(tlstate.getShape('rect2').point).toStrictEqual([110, 110])
    })

    it('clones the shapes and children', () => {
      tlstate
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group()
        .startSession(SessionType.Translate, [10, 10])
        .updateSession([20, 20], false, true)
        .completeSession()
    })

    it('deletes clones when not cloning anymore', () => {
      tlstate
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group()
        .startSession(SessionType.Translate, [10, 10])
        .updateSession([20, 20], false, true)
        .updateSession([20, 20], false, false)
        .updateSession([20, 20], false, true)
        .completeSession()
    })

    it('clones the shapes and children when selecting a group and a different shape', () => {
      tlstate
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
    const tlstate = new TLDrawState()
      .loadDocument(mockDocument)
      .select('rect1')
      .startSession(SessionType.Translate, [5, 5], true)
      .updateSession([10, 10])
      .completeSession()
      .undo()

    expect(tlstate.getShape('rect1')).toBe(undefined)
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
})
