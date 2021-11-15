import { mockDocument, TLDrawTestApp } from '~test'
import { ArrowShape, SessionType, TLDrawShapeType, TLDrawStatus } from '~types'

describe('Arrow session', () => {
  const restoreDoc = new TLDrawTestApp()
    .loadDocument(mockDocument)
    .selectAll()
    .delete()
    .createShapes(
      { type: TLDrawShapeType.Rectangle, id: 'target1', point: [0, 0], size: [100, 100] },
      { type: TLDrawShapeType.Arrow, id: 'arrow1', point: [200, 200] }
    ).document

  it('begins, updateSession', () => {
    const state = new TLDrawTestApp()
      .loadDocument(restoreDoc)
      .select('arrow1')
      .movePointer([200, 200])
      .startSession(SessionType.Arrow, 'arrow1', 'start')
      .movePointer([50, 50])
      .completeSession()

    const binding = state.bindings[0]

    expect(binding).toBeTruthy()
    expect(binding.fromId).toBe('arrow1')
    expect(binding.toId).toBe('target1')
    expect(binding.handleId).toBe('start')
    expect(state.appState.status).toBe(TLDrawStatus.Idle)
    expect(state.getShape('arrow1').handles?.start.bindingId).toBe(binding.id)

    state.undo()

    expect(state.bindings[0]).toBe(undefined)
    expect(state.getShape('arrow1').handles?.start.bindingId).toBe(undefined)

    state.redo()

    expect(state.bindings[0]).toBeTruthy()
    expect(state.getShape('arrow1').handles?.start.bindingId).toBe(binding.id)
  })

  it('cancels session', () => {
    const state = new TLDrawTestApp()
      .loadDocument(restoreDoc)
      .select('arrow1')
      .movePointer([200, 200])
      .startSession(SessionType.Arrow, 'arrow1', 'start')
      .movePointer([50, 50])
      .cancelSession()

    expect(state.bindings[0]).toBe(undefined)
    expect(state.getShape('arrow1').handles?.start.bindingId).toBe(undefined)
  })

  describe('arrow binding', () => {
    it('points to the center', () => {
      const state = new TLDrawTestApp()
        .loadDocument(restoreDoc)
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([50, 50])
      expect(state.bindings[0].point).toStrictEqual([0.5, 0.5])
    })

    it('Snaps to the center', () => {
      const state = new TLDrawTestApp()
        .loadDocument(restoreDoc)
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([55, 55])
      expect(state.bindings[0].point).toStrictEqual([0.5, 0.5])
    })

    it('Binds at the bottom left', () => {
      const state = new TLDrawTestApp()
        .loadDocument(restoreDoc)
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([124, -24])
      expect(state.bindings[0].point).toStrictEqual([1, 0])
    })

    it('Cancels the bind when off of the expanded bounds', () => {
      const state = new TLDrawTestApp()
        .loadDocument(restoreDoc)
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([133, 133])

      expect(state.bindings[0]).toBe(undefined)
    })

    it('binds on the inside of a shape while alt is held', () => {
      const state = new TLDrawTestApp()
        .loadDocument(restoreDoc)
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([91, 9])

      expect(state.bindings[0].point).toStrictEqual([0.71, 0.11])

      state.movePointer({ x: 91, y: 9, altKey: true })
    })

    it('snaps to the inside center when the point is close to the center', () => {
      const state = new TLDrawTestApp()
        .loadDocument(restoreDoc)
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer({ x: 91, y: 9, altKey: true })

      expect(state.bindings[0].point).toStrictEqual([0.78, 0.22])
    })

    it('ignores binding when meta is held', () => {
      const state = new TLDrawTestApp()
        .loadDocument(restoreDoc)
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer({ x: 55, y: 45, ctrlKey: true })

      expect(state.bindings.length).toBe(0)
    })
  })

  describe('when dragging a bound shape', () => {
    it('updates the arrow', () => {
      const state = new TLDrawTestApp()

      state
        .loadDocument(restoreDoc)
        // Select the arrow and begin a session on the handle's start handle
        .movePointer([200, 200])
        .select('arrow1')
        .startSession(SessionType.Arrow, 'arrow1', 'start')
      // Move to [50,50]
      state.movePointer([50, 50])
      // Both handles will keep the same screen positions, but their points will have changed.
      expect(state.getShape<ArrowShape>('arrow1').point).toStrictEqual([116, 116])
      expect(state.getShape<ArrowShape>('arrow1').handles.start.point).toStrictEqual([0, 0])
      expect(state.getShape<ArrowShape>('arrow1').handles.end.point).toStrictEqual([85, 85])
    })

    it.todo('updates the arrow when bound on both sides')

    it.todo('snaps the bend to zero when dragging the bend handle toward the center')
  })
})

describe('When creating with an arrow session', () => {
  it('Deletes the shape on undo', () => {
    const state = new TLDrawTestApp()
      .createShapes({ type: TLDrawShapeType.Arrow, id: 'arrow1', point: [200, 200] })
      .select('arrow1')
      .movePointer([200, 200])
      .startSession(SessionType.Arrow, 'arrow1', 'start', true)
      .movePointer([55, 45])
      .completeSession()
      .undo()

    expect(state.getShape('arrow1')).toBe(undefined)
  })

  it("Doesn't corrupt a shape after undoing", () => {
    const state = new TLDrawTestApp()
      .createShapes(
        { type: TLDrawShapeType.Rectangle, id: 'rect1', point: [200, 200], size: [200, 200] },
        { type: TLDrawShapeType.Rectangle, id: 'rect2', point: [400, 200], size: [200, 200] }
      )
      .selectTool(TLDrawShapeType.Arrow)
      .pointShape('rect1', { x: 250, y: 250 })
      .movePointer([450, 250])
      .stopPointing()

    expect(state.bindings.length).toBe(2)

    state.undo()

    expect(state.bindings.length).toBe(0)

    state.select('rect1').pointShape('rect1', [250, 250]).movePointer([275, 275]).completeSession()

    expect(state.bindings.length).toBe(0)
  })

  it('Creates a start binding if possible', () => {
    const state = new TLDrawTestApp()
      .createShapes(
        { type: TLDrawShapeType.Rectangle, id: 'rect1', point: [200, 200], size: [200, 200] },
        { type: TLDrawShapeType.Rectangle, id: 'rect2', point: [400, 200], size: [200, 200] }
      )
      .selectTool(TLDrawShapeType.Arrow)
      .pointShape('rect1', { x: 250, y: 250 })
      .movePointer([450, 250])
      .completeSession()

    const arrow = state.shapes.find((shape) => shape.type === TLDrawShapeType.Arrow) as ArrowShape

    expect(arrow).toBeTruthy()
    expect(state.bindings.length).toBe(2)
    expect(arrow.handles.start.bindingId).not.toBe(undefined)
    expect(arrow.handles.end.bindingId).not.toBe(undefined)
  })

  it('Removes a binding when dragged away', () => {
    const state = new TLDrawTestApp()
      .createShapes(
        { type: TLDrawShapeType.Rectangle, id: 'rect1', point: [200, 200], size: [200, 200] },
        { type: TLDrawShapeType.Rectangle, id: 'rect2', point: [400, 200], size: [200, 200] },
        { type: TLDrawShapeType.Arrow, id: 'arrow1', point: [250, 250] }
      )
      .select('arrow1')
      .movePointer([250, 250])
      .startSession(SessionType.Arrow, 'arrow1', 'end', true)
      .movePointer([450, 250])
      .completeSession()
      .select('arrow1')
      .startSession(SessionType.Arrow, 'arrow1', 'start', false)
      .movePointer([0, 0])
      .completeSession()

    const arrow = state.shapes.find((shape) => shape.type === TLDrawShapeType.Arrow) as ArrowShape

    expect(arrow).toBeTruthy()

    expect(state.bindings.length).toBe(1)

    expect(arrow.handles.start.point).toStrictEqual([0, 0])
    expect(arrow.handles.start.bindingId).toBe(undefined)
    expect(arrow.handles.end.bindingId).not.toBe(undefined)
  })
})
