import { mockDocument, TLDrawTestApp } from '~test'
import { GroupShape, SessionType, TLDrawShapeType, TLDrawStatus } from '~types'

describe('Translate session', () => {
  it('begins, updateSession', () => {
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .pointShape('rect1', [5, 5])
      .movePointer([10, 10])

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
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .pointBounds([5, 5])
      .movePointer([10, 10])
      .cancelSession()

    expect(state.getShape('rect1').point).toStrictEqual([0, 0])
  })

  it('moves a single shape', () => {
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .pointShape('rect1', [10, 10])
      .movePointer([20, 20])
      .completeSession()

    expect(state.getShape('rect1').point).toStrictEqual([10, 10])
  })

  it('moves a single shape along a locked axis', () => {
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .select('rect1')
      .pointShape('rect1', [10, 10])
      .movePointer({ x: 20, y: 20, shiftKey: true })
      .completeSession()

    expect(state.getShape('rect1').point).toStrictEqual([10, 0])
  })

  it('moves two shapes', () => {
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .pointBounds([10, 10])
      .movePointer([20, 20])
      .completeSession()

    expect(state.getShape('rect1').point).toStrictEqual([10, 10])
    expect(state.getShape('rect2').point).toStrictEqual([110, 110])
  })

  it('undos and redos clones', () => {
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .pointBounds([10, 10])
      .movePointer({ x: 20, y: 20, altKey: true })
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
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .pointBounds([10, 10])
      .movePointer({ x: 20, y: 20, altKey: true })
      .completeSession()

    expect(state.getShape('rect1').point).toStrictEqual([0, 0])
    expect(state.getShape('rect2').point).toStrictEqual([100, 100])

    expect(Object.keys(state.getPage().shapes).length).toBe(5)
  })

  it('destroys clones when last update is not cloning', () => {
    const state = new TLDrawTestApp().loadDocument(mockDocument)

    expect(Object.keys(state.getPage().shapes).length).toBe(3)

    state.select('rect1', 'rect2').pointBounds([10, 10]).movePointer({ x: 20, y: 20, altKey: true })

    expect(Object.keys(state.getPage().shapes).length).toBe(5)

    state.movePointer({ x: 30, y: 30 })

    expect(Object.keys(state.getPage().shapes).length).toBe(3)

    state.completeSession()

    // Original position + delta
    expect(state.getShape('rect1').point).toStrictEqual([30, 30])
    expect(state.getShape('rect2').point).toStrictEqual([130, 130])

    expect(Object.keys(state.page.shapes)).toStrictEqual(['rect1', 'rect2', 'rect3'])
  })

  it('destroys bindings from the translating shape', () => {
    const state = new TLDrawTestApp()
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
      .movePointer([200, 200])
      .startSession(SessionType.Arrow, 'arrow1', 'start')
      .movePointer([50, 50])
      .completeSession()

    expect(state.bindings.length).toBe(1)

    state.pointShape('arrow1', [10, 10]).movePointer([30, 30]).completeSession()

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
      const state = new TLDrawTestApp()
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group(['rect1', 'rect2'], 'groupA')
        .pointShape('rect1', [10, 10])
        .movePointer({ x: 20, y: 20 })
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

    it('clones the shape and updates the parent', () => {
      const state = new TLDrawTestApp()
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group(['rect1', 'rect2'], 'groupA')
        .doubleClickShape('rect1')
        .pointShape('rect1', [10, 10])
        .movePointer({ x: 10, y: 10, altKey: true })
        .movePointer({ x: 20, y: 20, altKey: true })
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
      const state = new TLDrawTestApp()
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group(['rect1', 'rect2'], 'groupA')
        .pointShape('groupA', [10, 10])
        .movePointer({ x: 20, y: 20 })
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
      new TLDrawTestApp()
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group(['rect1', 'rect2'], 'groupA')
        .pointShape('groupA', [10, 10])
        .movePointer({ x: 20, y: 20, altKey: true })
        .completeSession()
    })

    it('deletes clones when not cloning anymore', () => {
      const state = new TLDrawTestApp()
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group(['rect1', 'rect2'], 'groupA')
        .pointShape('groupA', [10, 10])
        .movePointer({ x: 20, y: 20, altKey: true })
        .movePointer({ x: 20, y: 20, altKey: false })
        .movePointer({ x: 20, y: 20, altKey: true })
        .completeSession()

      expect(state.shapes.filter((shape) => shape.type === TLDrawShapeType.Group).length).toBe(2)
    })

    it('deletes clones when not cloning anymore', () => {
      const state = new TLDrawTestApp()
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group(['rect1', 'rect2'], 'groupA')
        .pointShape('groupA', [10, 10])
        .movePointer({ x: 20, y: 20, altKey: true })
        .movePointer({ x: 20, y: 20, altKey: false })
        .completeSession()

      expect(state.shapes.filter((shape) => shape.type === TLDrawShapeType.Group).length).toBe(1)
    })

    it('clones the shapes and children when selecting a group and a different shape', () => {
      const state = new TLDrawTestApp()
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group(['rect1', 'rect2'], 'groupA')
        .select('groupA', 'rect3')
        .pointBounds([10, 10])
        .movePointer({ x: 20, y: 20, altKey: true })
        .completeSession()
    })
  })
})

describe('When creating with a translate session', () => {
  it('Deletes the shape on undo', () => {
    const state = new TLDrawTestApp()
      .selectTool(TLDrawShapeType.Rectangle)
      .pointCanvas([0, 0])
      .movePointer([10, 10])
      .completeSession()

    expect(state.shapes.length).toBe(1)

    state.undo()

    expect(state.shapes.length).toBe(0)
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
