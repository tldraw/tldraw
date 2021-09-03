import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { TLDrawShapeType, TLDrawStatus } from '~types'

describe('Translate session', () => {
  const tlstate = new TLDrawState()

  it('begins, updates and completes session', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1')
      .startTranslateSession([5, 5])
      .updateTranslateSession([10, 10])

    expect(tlstate.getShape('rect1').point).toStrictEqual([5, 5])

    tlstate.completeSession()

    expect(tlstate.appState.status.current).toBe(TLDrawStatus.Idle)

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
      .startTranslateSession([5, 5])
      .updateTranslateSession([10, 10])
      .cancelSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])
  })

  it('moves a single shape', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1')
      .startTranslateSession([10, 10])
      .updateTranslateSession([20, 20])
      .completeSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([10, 10])
  })

  it('moves a single shape along a locked axis', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1')
      .startTranslateSession([10, 10])
      .updateTranslateSession([20, 20], true)
      .completeSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([10, 0])
  })

  it('moves two shapes', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .startTranslateSession([10, 10])
      .updateTranslateSession([20, 20])
      .completeSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([10, 10])
    expect(tlstate.getShape('rect2').point).toStrictEqual([110, 110])
  })

  it('undos and redos clones', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .startTranslateSession([10, 10])
      .updateTranslateSession([20, 20], false, true)
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
      .startTranslateSession([10, 10])
      .updateTranslateSession([20, 20], false, true)
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
      .startTranslateSession([10, 10])
      .updateTranslateSession([20, 20], false, true)

    expect(Object.keys(tlstate.getPage().shapes).length).toBe(5)

    tlstate.updateTranslateSession([30, 30], false, false)

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
      .startHandleSession([200, 200], 'start')
      .updateHandleSession([50, 50])
      .completeSession()

    expect(tlstate.bindings.length).toBe(1)

    tlstate
      .select('arrow1')
      .startTranslateSession([10, 10])
      .updateTranslateSession([30, 30])
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

  describe('when translating a shape with children', () => {
    it('translates the shapes children', () => {
      tlstate
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group()
        .startTranslateSession([10, 10])
        .updateTranslateSession([20, 20], false, false)
        .completeSession()
    })

    it('clones the shapes and children', () => {
      tlstate
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group()
        .startTranslateSession([10, 10])
        .updateTranslateSession([20, 20], false, true)
        .completeSession()
    })

    it('deletes clones when not cloning anymore', () => {
      tlstate
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group()
        .startTranslateSession([10, 10])
        .updateTranslateSession([20, 20], false, true)
        .updateTranslateSession([20, 20], false, false)
        .updateTranslateSession([20, 20], false, true)
        .completeSession()
    })

    it('clones the shapes and children when selecting a group and a different shape', () => {
      tlstate
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group(['rect1', 'rect2'], 'groupA')
        .select('groupA', 'rect3')
        .startTranslateSession([10, 10])
        .updateTranslateSession([20, 20], false, true)
        .completeSession()
    })
  })
})
