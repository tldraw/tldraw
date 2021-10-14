import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { ArrowShape, SessionType, TLDrawShapeType, TLDrawStatus } from '~types'

describe('Arrow session', () => {
  const tlstate = new TLDrawState()

  tlstate
    .loadDocument(mockDocument)
    .selectAll()
    .delete()
    .createShapes(
      { type: TLDrawShapeType.Rectangle, id: 'target1', point: [0, 0], size: [100, 100] },
      { type: TLDrawShapeType.Arrow, id: 'arrow1', point: [200, 200] }
    )

  const restoreDoc = tlstate.document

  it('begins, updateSession', () => {
    const tlstate = new TLDrawState()
      .loadDocument(restoreDoc)
      .select('arrow1')
      .startSession(SessionType.Arrow, [200, 200], 'start')
      .updateSession([50, 50])
      .completeSession()

    const binding = tlstate.bindings[0]

    expect(binding).toBeTruthy()
    expect(binding.fromId).toBe('arrow1')
    expect(binding.toId).toBe('target1')
    expect(binding.meta.handleId).toBe('start')
    expect(tlstate.appState.status).toBe(TLDrawStatus.Idle)
    expect(tlstate.getShape('arrow1').handles?.start.bindingId).toBe(binding.id)

    tlstate.undo()

    expect(tlstate.bindings[0]).toBe(undefined)
    expect(tlstate.getShape('arrow1').handles?.start.bindingId).toBe(undefined)

    tlstate.redo()

    expect(tlstate.bindings[0]).toBeTruthy()
    expect(tlstate.getShape('arrow1').handles?.start.bindingId).toBe(binding.id)
  })

  it('cancels session', () => {
    const tlstate = new TLDrawState()
      .loadDocument(restoreDoc)
      .select('arrow1')
      .startSession(SessionType.Arrow, [200, 200], 'start')
      .updateSession([50, 50])
      .cancelSession()

    expect(tlstate.bindings[0]).toBe(undefined)
    expect(tlstate.getShape('arrow1').handles?.start.bindingId).toBe(undefined)
  })

  describe('arrow binding', () => {
    it('points to the center', () => {
      const tlstate = new TLDrawState()
        .loadDocument(restoreDoc)
        .select('arrow1')
        .startSession(SessionType.Arrow, [200, 200], 'start')
        .updateSession([50, 50])
      expect(tlstate.bindings[0].meta.point).toStrictEqual([0.5, 0.5])
    })

    it('Snaps to the center', () => {
      const tlstate = new TLDrawState()
        .loadDocument(restoreDoc)
        .select('arrow1')
        .startSession(SessionType.Arrow, [200, 200], 'start')
        .updateSession([55, 55])
      expect(tlstate.bindings[0].meta.point).toStrictEqual([0.5, 0.5])
    })

    it('Binds at the bottom left', () => {
      const tlstate = new TLDrawState()
        .loadDocument(restoreDoc)
        .select('arrow1')
        .startSession(SessionType.Arrow, [200, 200], 'start')
        .updateSession([132, -32])
      expect(tlstate.bindings[0].meta.point).toStrictEqual([1, 0])
    })

    it('Cancels the bind when off of the expanded bounds', () => {
      const tlstate = new TLDrawState()
        .loadDocument(restoreDoc)
        .select('arrow1')
        .startSession(SessionType.Arrow, [200, 200], 'start')
        .updateSession([133, 133])

      expect(tlstate.bindings[0]).toBe(undefined)
    })

    it('binds on the inside of a shape while meta is held', () => {
      const tlstate = new TLDrawState()
        .loadDocument(restoreDoc)
        .select('arrow1')
        .startSession(SessionType.Arrow, [200, 200], 'start')
        .updateSession([91, 9])

      expect(tlstate.bindings[0].meta.point).toStrictEqual([0.68, 0.13])

      tlstate.updateSession([91, 9], false, false, true)
    })

    it('snaps to the center when the point is close to the center', () => {
      const tlstate = new TLDrawState()
        .loadDocument(restoreDoc)
        .select('arrow1')
        .startSession(SessionType.Arrow, [200, 200], 'start')
        .updateSession([91, 9])

      expect(tlstate.bindings[0].meta.point).toStrictEqual([0.68, 0.13])

      tlstate.updateSession([91, 9], false, false, true)

      expect(tlstate.bindings[0].meta.point).toStrictEqual([0.75, 0.25])
    })

    it('ignores binding when alt is held', () => {
      const tlstate = new TLDrawState()
        .loadDocument(restoreDoc)
        .select('arrow1')
        .startSession(SessionType.Arrow, [200, 200], 'start')
        .updateSession([55, 45])

      expect(tlstate.bindings[0].meta.point).toStrictEqual([0.5, 0.5])

      tlstate.updateSession([55, 45], false, false, true)

      expect(tlstate.bindings[0].meta.point).toStrictEqual([0.5, 0.5])
    })
  })

  describe('when dragging a bound shape', () => {
    it('updates the arrow', () => {
      const tlstate = new TLDrawState()

      tlstate.loadDocument(restoreDoc)
      // Select the arrow and begin a session on the handle's start handle
      tlstate.select('arrow1').startSession(SessionType.Arrow, [200, 200], 'start')
      // Move to [50,50]
      tlstate.updateSession([50, 50])
      // Both handles will keep the same screen positions, but their points will have changed.
      expect(tlstate.getShape<ArrowShape>('arrow1').point).toStrictEqual([116, 116])
      expect(tlstate.getShape<ArrowShape>('arrow1').handles.start.point).toStrictEqual([0, 0])
      expect(tlstate.getShape<ArrowShape>('arrow1').handles.end.point).toStrictEqual([85, 85])
    })

    it.todo('updates the arrow when bound on both sides')

    it.todo('snaps the bend to zero when dragging the bend handle toward the center')
  })
})
