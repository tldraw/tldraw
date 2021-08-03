import { TLDrawState } from '../../../tlstate'
import { mockDocument } from '../../../test-helpers'

describe('Brush session', () => {
  const tlstate = new TLDrawState()

  it('begins, updates and completes session', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.select('rect1')
    tlstate.startTranslateSession([5, 5])
    tlstate.updateTranslateSession([10, 10])
    expect(tlstate.getShape('rect1').point).toStrictEqual([5, 5])

    tlstate.completeSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([5, 5])

    tlstate.undo()

    expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])

    tlstate.redo()

    expect(tlstate.getShape('rect1').point).toStrictEqual([5, 5])
  })

  it('moves a single shape', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.select('rect1')
    tlstate.startTranslateSession([10, 10])
    tlstate.updateTranslateSession([20, 20])
    tlstate.completeSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([10, 10])
  })

  it('moves a single shape along a locked axis', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.select('rect1')
    tlstate.startTranslateSession([10, 10])
    tlstate.updateTranslateSession([20, 20], true)
    tlstate.completeSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([10, 0])
  })

  it('moves two shapes', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.select('rect1', 'rect2')
    tlstate.startTranslateSession([10, 10])
    tlstate.updateTranslateSession([20, 20])
    tlstate.completeSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([10, 10])
    expect(tlstate.getShape('rect2').point).toStrictEqual([110, 110])
  })

  it('clones shapes', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.select('rect1', 'rect2')
    tlstate.startTranslateSession([10, 10])
    tlstate.updateTranslateSession([20, 20], false, true)
    tlstate.completeSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])
    expect(tlstate.getShape('rect2').point).toStrictEqual([100, 100])

    expect(Object.keys(tlstate.getPage().shapes).length).toBe(4)
  })

  it('destroys clones when last update is not cloning', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.select('rect1', 'rect2')
    tlstate.startTranslateSession([10, 10])
    tlstate.updateTranslateSession([20, 20], false, true)
    tlstate.updateTranslateSession([30, 30])
    tlstate.completeSession()

    // Original position + delta
    expect(tlstate.getShape('rect1').point).toStrictEqual([30, 30])
    expect(tlstate.getShape('rect2').point).toStrictEqual([130, 130])

    expect(Object.keys(tlstate.getPage().shapes).length).toBe(2)
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
