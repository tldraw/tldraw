import { TLDrawState } from '~state'
import { mockDocument, TLDrawStateUtils } from '~test'
import { SessionType, TLDrawShapeType } from '~types'
import { SelectTool } from '.'

describe('SelectTool', () => {
  it('creates tool', () => {
    const tlstate = new TLDrawState()
    new SelectTool(tlstate)
  })
})

describe('When double clicking link controls', () => {
  const doc = new TLDrawState()
    .createShapes(
      {
        id: 'rect1',
        type: TLDrawShapeType.Rectangle,
        point: [0, 0],
        size: [100, 100],
      },
      {
        id: 'rect2',
        type: TLDrawShapeType.Rectangle,
        point: [100, 0],
        size: [100, 100],
      },
      {
        id: 'rect3',
        type: TLDrawShapeType.Rectangle,
        point: [200, 0],
        size: [100, 100],
      },
      {
        id: 'arrow1',
        type: TLDrawShapeType.Arrow,
        point: [200, 200],
      },
      {
        id: 'arrow2',
        type: TLDrawShapeType.Arrow,
        point: [200, 200],
      }
    )
    .select('arrow1')
    .startSession(SessionType.Arrow, [200, 200], 'start')
    .updateSession([50, 50])
    .completeSession()
    .startSession(SessionType.Arrow, [200, 200], 'end')
    .updateSession([150, 50])
    .completeSession()
    .select('arrow2')
    .startSession(SessionType.Arrow, [200, 200], 'start')
    .updateSession([150, 50])
    .completeSession()
    .startSession(SessionType.Arrow, [200, 200], 'end')
    .updateSession([250, 50])
    .completeSession()
    .deselectAll().document

  it('moves all linked shapes when center is dragged', () => {
    const tlstate = new TLDrawState().loadDocument(doc).select('rect2')
    const tlu = new TLDrawStateUtils(tlstate)

    tlu
      .pointBoundsHandle('center')
      .movePointer({ x: 100, y: 100 })
      .expectShapesToBeAtPoints({
        rect1: [100, 100],
        rect2: [200, 100],
        rect3: [300, 100],
      })

    tlstate.completeSession().undo()

    tlu.expectShapesToBeAtPoints({
      rect1: [0, 0],
      rect2: [100, 0],
      rect3: [200, 0],
    })
  })

  it('moves all upstream shapes when center is dragged', () => {
    const tlstate = new TLDrawState().loadDocument(doc).select('rect2')
    const tlu = new TLDrawStateUtils(tlstate)

    tlu.pointBoundsHandle('left').movePointer({ x: 100, y: 100 })

    expect(tlstate.getShape('rect1').point).toEqual([100, 100])
    expect(tlstate.getShape('rect2').point).toEqual([200, 100])
    expect(tlstate.getShape('rect3').point).toEqual([200, 0])
  })

  it('moves all downstream shapes when center is dragged', () => {
    const tlstate = new TLDrawState().loadDocument(doc).select('rect2')
    const tlu = new TLDrawStateUtils(tlstate)

    tlu.pointBoundsHandle('right').movePointer({ x: 100, y: 100 })

    expect(tlstate.getShape('rect1').point).toEqual([0, 0])
    expect(tlstate.getShape('rect2').point).toEqual([200, 100])
    expect(tlstate.getShape('rect3').point).toEqual([300, 100])
  })

  it('selects all linked shapes when center is double clicked', () => {
    const tlstate = new TLDrawState().loadDocument(doc).select('rect2')
    const tlu = new TLDrawStateUtils(tlstate)

    tlu.doubleClickBoundHandle('center').expectSelectedIdsToBe(['rect2', 'rect1', 'rect3'])
  })

  it('selects all linked shapes and arrows when center is double clicked while holding shift', () => {
    const tlstate = new TLDrawState().loadDocument(doc).select('rect2')
    const tlu = new TLDrawStateUtils(tlstate)

    tlu
      .doubleClickBoundHandle('center', { shiftKey: true })
      .expectSelectedIdsToBe(['rect2', 'rect1', 'rect3', 'arrow1', 'arrow2'])
  })

  it('selects all upstream linked shapes when left is double clicked', () => {
    const tlstate = new TLDrawState().loadDocument(doc).select('rect2')
    const tlu = new TLDrawStateUtils(tlstate)

    tlu.doubleClickBoundHandle('left').expectSelectedIdsToBe(['rect1', 'rect2'])
  })

  it('selects all upstream linked shapes and arrows when left is double clicked with shift', () => {
    const tlstate = new TLDrawState().loadDocument(doc).select('rect2')
    const tlu = new TLDrawStateUtils(tlstate)

    tlu
      .doubleClickBoundHandle('left', { shiftKey: true })
      .expectSelectedIdsToBe(['rect1', 'rect2', 'arrow1'])
  })

  it('selects all downstream linked shapes when right is double clicked', () => {
    const tlstate = new TLDrawState().loadDocument(doc).select('rect2')
    const tlu = new TLDrawStateUtils(tlstate)

    tlu.doubleClickBoundHandle('right').expectSelectedIdsToBe(['rect2', 'rect3'])
  })

  it('selects all downstream linked shapes and arrows when right is double clicked with shift', () => {
    const tlstate = new TLDrawState().loadDocument(doc).select('rect2')
    const tlu = new TLDrawStateUtils(tlstate)

    tlu
      .doubleClickBoundHandle('right', { shiftKey: true })
      .expectSelectedIdsToBe(['rect2', 'rect3', 'arrow2'])
  })
})

describe('When selecting grouped shapes', () => {
  it('Selects the group on single click', () => {
    const tlstate = new TLDrawState().loadDocument(mockDocument).group(['rect1', 'rect2'], 'groupA')

    new TLDrawStateUtils(tlstate).clickShape('rect1')

    expect(tlstate.selectedIds).toStrictEqual(['groupA'])
  })

  it('Drills in and selects the child on double click', () => {
    const tlstate = new TLDrawState().loadDocument(mockDocument).group(['rect1', 'rect2'], 'groupA')

    new TLDrawStateUtils(tlstate).doubleClickShape('rect1')

    expect(tlstate.selectedIds).toStrictEqual(['rect1'])
  })

  it('Selects a sibling on single click after drilling', () => {
    const tlstate = new TLDrawState().loadDocument(mockDocument).group(['rect1', 'rect2'], 'groupA')

    new TLDrawStateUtils(tlstate).doubleClickShape('rect1').clickShape('rect2')

    expect(tlstate.selectedIds).toStrictEqual(['rect2'])
  })

  it('Selects the group again after selecting a different shape', () => {
    const tlstate = new TLDrawState()
      .loadDocument(mockDocument)
      .selectAll()
      .group(['rect1', 'rect2'], 'groupA')

    new TLDrawStateUtils(tlstate).doubleClickShape('rect1').clickShape('rect3').clickShape('rect1')

    expect(tlstate.selectedIds).toStrictEqual(['groupA'])
  })

  it('Selects grouped text on double click', () => {
    const tlstate = new TLDrawState()
      .loadDocument(mockDocument)
      .createShapes({
        id: 'text1',
        type: TLDrawShapeType.Text,
        text: 'Hello world',
      })
      .group(['rect1', 'rect2', 'text1'], 'groupA')

    new TLDrawStateUtils(tlstate).doubleClickShape('text1')

    expect(tlstate.selectedIds).toStrictEqual(['text1'])
    expect(tlstate.pageState.editingId).toBeUndefined()
  })

  it('Edits grouped text on double click after selecting', () => {
    const tlstate = new TLDrawState()
      .loadDocument(mockDocument)
      .createShapes({
        id: 'text1',
        type: TLDrawShapeType.Text,
        text: 'Hello world',
      })
      .group(['rect1', 'rect2', 'text1'], 'groupA')

    new TLDrawStateUtils(tlstate).doubleClickShape('text1').doubleClickShape('text1')

    expect(tlstate.selectedIds).toStrictEqual(['text1'])
    expect(tlstate.pageState.editingId).toBe('text1')
  })
})
