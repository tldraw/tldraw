import { TLDR } from '../../../tldr'
import { TLDrawState } from '../../../tlstate'
import { mockDocument } from '../../../test-helpers'
import type { ArrowShape, TLDrawShape } from '../../../../shape'

describe('Brush session', () => {
  const tlstate = new TLDrawState()

  it('begins, updates and completes session', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1')
      .startTranslateSession([5, 5])
      .updateTranslateSession([10, 10])

    expect(tlstate.getShape('rect1').point).toStrictEqual([5, 5])

    tlstate.completeSession()

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
    tlstate
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .startTranslateSession([10, 10])
      .updateTranslateSession([20, 20], false, true)
      .updateTranslateSession([30, 30])
      .completeSession()

    // Original position + delta
    expect(tlstate.getShape('rect1').point).toStrictEqual([30, 30])
    expect(tlstate.getShape('rect2').point).toStrictEqual([130, 130])

    expect(Object.keys(tlstate.getPage().shapes).length).toBe(3)
  })

  it('destroys bindings from the translating shape', () => {
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

    expect(tlstate.bindings.length).toBe(0)
    expect(tlstate.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(undefined)

    tlstate.undo()

    expect(tlstate.bindings.length).toBe(1)
    expect(tlstate.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBeTruthy()

    tlstate.redo()

    expect(tlstate.bindings.length).toBe(0)
    expect(tlstate.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(undefined)
  })

  // it('clones a shape with a parent shape', () => {
  //   tlstate.loadDocument(mockDocument)
  //   // TODO
  // })

  // it('clones a shape with children', () => {
  //   tlstate.loadDocument(mockDocument)
  //   // TODO
  // })
})
