import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { TLDR } from '~state/tldr'
import type { ArrowShape, TLDrawShape } from '~types'

describe('Arrow session', () => {
  const tlstate = new TLDrawState()
  tlstate
    .loadDocument(mockDocument)
    .selectAll()
    .delete()
    .create(
      TLDR.getShapeUtils({ type: 'rectangle' } as TLDrawShape).create({
        id: 'target1',
        parentId: 'page1',
        point: [0, 0],
        size: [100, 100],
      })
    )
    .create(
      TLDR.getShapeUtils({ type: 'arrow' } as TLDrawShape).create({
        id: 'arrow1',
        parentId: 'page1',
        point: [200, 200],
      })
    )

  const restoreDoc = tlstate.document

  it('begins, updates and completes session', () => {
    tlstate
      .loadDocument(restoreDoc)
      .select('arrow1')
      .startHandleSession([200, 200], 'start')
      .updateHandleSession([50, 50])
      .completeSession()

    const binding = tlstate.bindings[0]

    expect(binding).toBeTruthy()
    expect(binding.fromId).toBe('arrow1')
    expect(binding.toId).toBe('target1')
    expect(binding.handleId).toBe('start')
    expect(tlstate.getShape('arrow1').handles?.start.bindingId).toBe(binding.id)

    tlstate.undo()

    expect(tlstate.bindings[0]).toBe(undefined)
    expect(tlstate.getShape('arrow1').handles?.start.bindingId).toBe(undefined)

    tlstate.redo()

    expect(tlstate.bindings[0]).toBeTruthy()
    expect(tlstate.getShape('arrow1').handles?.start.bindingId).toBe(binding.id)
  })

  it('cancels session', () => {
    tlstate
      .loadDocument(restoreDoc)
      .select('arrow1')
      .startHandleSession([200, 200], 'start')
      .updateHandleSession([50, 50])
      .cancelSession()

    expect(tlstate.bindings[0]).toBe(undefined)
    expect(tlstate.getShape('arrow1').handles?.start.bindingId).toBe(undefined)
  })

  describe('arrow binding', () => {
    it('points to the center', () => {
      tlstate
        .loadDocument(restoreDoc)
        .select('arrow1')
        .startHandleSession([200, 200], 'start')
        .updateHandleSession([50, 50])
      expect(tlstate.bindings[0].point).toStrictEqual([0.5, 0.5])
    })

    it('Snaps to the center', () => {
      tlstate
        .loadDocument(restoreDoc)
        .select('arrow1')
        .startHandleSession([200, 200], 'start')
        .updateHandleSession([55, 55])
      expect(tlstate.bindings[0].point).toStrictEqual([0.5, 0.5])
    })

    it('Binds at the bottom left', () => {
      tlstate
        .loadDocument(restoreDoc)
        .select('arrow1')
        .startHandleSession([200, 200], 'start')
        .updateHandleSession([132, -32])
      expect(tlstate.bindings[0].point).toStrictEqual([1, 0])
    })

    it('Cancels the bind when off of the expanded bounds', () => {
      tlstate
        .loadDocument(restoreDoc)
        .select('arrow1')
        .startHandleSession([200, 200], 'start')
        .updateHandleSession([133, 133])

      expect(tlstate.bindings[0]).toBe(undefined)
    })

    it('binds on the inside of a shape while meta is held', () => {
      tlstate
        .loadDocument(restoreDoc)
        .select('arrow1')
        .startHandleSession([200, 200], 'start')
        .updateHandleSession([91, 9])

      expect(tlstate.bindings[0].point).toStrictEqual([0.67839, 0.125])

      tlstate.updateHandleSession([91, 9], false, false, true)
    })

    it('snaps to the center when the point is close to the center', () => {
      tlstate
        .loadDocument(restoreDoc)
        .select('arrow1')
        .startHandleSession([200, 200], 'start')
        .updateHandleSession([91, 9])

      expect(tlstate.bindings[0].point).toStrictEqual([0.67839, 0.125])

      tlstate.updateHandleSession([91, 9], false, false, true)

      expect(tlstate.bindings[0].point).toStrictEqual([0.75, 0.25])
    })

    it('ignores binding when alt is held', () => {
      tlstate
        .loadDocument(restoreDoc)
        .select('arrow1')
        .startHandleSession([200, 200], 'start')
        .updateHandleSession([55, 45])

      expect(tlstate.bindings[0].point).toStrictEqual([0.5, 0.5])

      tlstate.updateHandleSession([55, 45], false, false, true)

      expect(tlstate.bindings[0].point).toStrictEqual([0.5, 0.5])
    })
  })

  describe('when dragging a bound shape', () => {
    it('updates the arrow', () => {
      tlstate.loadDocument(restoreDoc)
      // Select the arrow and begin a session on the handle's start handle
      tlstate.select('arrow1').startHandleSession([200, 200], 'start')
      // Move to [50,50]
      tlstate.updateHandleSession([50, 50]).completeSession()
      // Both handles will keep the same screen positions, but their points will have changed.
      expect(tlstate.getShape<ArrowShape>('arrow1').point).toStrictEqual([116, 116])
      expect(tlstate.getShape<ArrowShape>('arrow1').handles.start.point).toStrictEqual([0, 0])
      expect(tlstate.getShape<ArrowShape>('arrow1').handles.end.point).toStrictEqual([85, 85])
      // tlstate
      //   .select('target1')
      //   .startTranslateSession([50, 50])
      //   .updateTranslateSession([300, 0])
      //   .completeSession()
      // expect(tlstate.getShape<ArrowShape>('arrow1').handles.start.point).toStrictEqual([66.493, 0])
      // expect(tlstate.getShape<ArrowShape>('arrow1').handles.end.point).toStrictEqual([0, 135])
    })

    it('updates the arrow when bound on both sides', () => {
      // TODO
    })
  })
})
