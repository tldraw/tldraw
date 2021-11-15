import { mockDocument, TLDrawTestApp } from '~test'
import { SessionType, TLDrawShapeType } from '~types'
import { SelectTool } from '.'

describe('SelectTool', () => {
  it('creates tool', () => {
    const state = new TLDrawTestApp()
    new SelectTool(state)
  })
})

describe('When double clicking link controls', () => {
  const doc = new TLDrawTestApp()
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
    .movePointer({ x: 200, y: 200 })
    .startSession(SessionType.Arrow, 'arrow1', 'start')
    .movePointer({ x: 50, y: 50 })
    .completeSession()
    .movePointer({ x: 200, y: 200 })
    .startSession(SessionType.Arrow, 'arrow1', 'end')
    .movePointer({ x: 150, y: 50 })
    .completeSession()
    .select('arrow2')
    .movePointer({ x: 200, y: 200 })
    .startSession(SessionType.Arrow, 'arrow2', 'start')
    .movePointer({ x: 150, y: 50 })
    .completeSession()
    .movePointer({ x: 200, y: 200 })
    .startSession(SessionType.Arrow, 'arrow2', 'end')
    .movePointer({ x: 250, y: 50 })
    .completeSession()
    .selectNone().document

  it('moves all linked shapes when center is dragged', () => {
    const app = new TLDrawTestApp()
      .loadDocument(doc)
      .select('rect2')
      .pointBoundsHandle('center', { x: 0, y: 0 })

    app.movePointer({ x: 100, y: 100 }).expectShapesToBeAtPoints({
      rect1: [100, 100],
      rect2: [200, 100],
      rect3: [300, 100],
    })

    app.completeSession().undo()

    app.expectShapesToBeAtPoints({
      rect1: [0, 0],
      rect2: [100, 0],
      rect3: [200, 0],
    })
  })

  it('moves all upstream shapes when center is dragged', () => {
    const state = new TLDrawTestApp()
      .loadDocument(doc)
      .select('rect2')
      .pointBoundsHandle('center')
      .movePointer({ x: 100, y: 100 })

    expect(state.getShape('rect1').point).toEqual([100, 100])
    expect(state.getShape('rect2').point).toEqual([200, 100])
    expect(state.getShape('rect3').point).toEqual([300, 100])
  })

  it('moves all downstream shapes when center is dragged', () => {
    const state = new TLDrawTestApp()
      .loadDocument(doc)
      .select('rect2')
      .pointBoundsHandle('right')
      .movePointer({ x: 100, y: 100 })

    expect(state.getShape('rect1').point).toEqual([0, 0])
    expect(state.getShape('rect2').point).toEqual([200, 100])
    expect(state.getShape('rect3').point).toEqual([300, 100])
  })

  it('selects all linked shapes when center is double clicked', () => {
    new TLDrawTestApp()
      .loadDocument(doc)
      .select('rect2')
      .doubleClickBoundHandle('center')
      .expectSelectedIdsToBe(['rect2', 'rect1', 'rect3'])
  })

  it('selects all linked shapes and arrows when center is double clicked while holding shift', () => {
    new TLDrawTestApp()
      .loadDocument(doc)
      .select('rect2')
      .doubleClickBoundHandle('center', { shiftKey: true })
      .expectSelectedIdsToBe(['rect2', 'rect1', 'rect3', 'arrow1', 'arrow2'])
  })

  it('selects all upstream linked shapes when left is double clicked', () => {
    new TLDrawTestApp()
      .loadDocument(doc)
      .select('rect2')
      .doubleClickBoundHandle('left')
      .expectSelectedIdsToBe(['rect1', 'rect2'])
  })

  it('selects all upstream linked shapes and arrows when left is double clicked with shift', () => {
    new TLDrawTestApp()
      .loadDocument(doc)
      .select('rect2')
      .doubleClickBoundHandle('left', { shiftKey: true })
      .expectSelectedIdsToBe(['rect1', 'rect2', 'arrow1'])
  })

  it('selects all downstream linked shapes when right is double clicked', () => {
    new TLDrawTestApp()
      .loadDocument(doc)
      .select('rect2')
      .doubleClickBoundHandle('right')
      .expectSelectedIdsToBe(['rect2', 'rect3'])
  })

  it('selects all downstream linked shapes and arrows when right is double clicked with shift', () => {
    new TLDrawTestApp()
      .loadDocument(doc)
      .select('rect2')
      .doubleClickBoundHandle('right', { shiftKey: true })
      .expectSelectedIdsToBe(['rect2', 'rect3', 'arrow2'])
  })
})

describe('When selecting grouped shapes', () => {
  it('Selects the group on single click', () => {
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .group(['rect1', 'rect2'], 'groupA')

      .clickShape('rect1')

    expect(state.selectedIds).toStrictEqual(['groupA'])
  })

  it('Drills in and selects the child on double click', () => {
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .group(['rect1', 'rect2'], 'groupA')
      .doubleClickShape('rect1')

    expect(state.selectedIds).toStrictEqual(['rect1'])
  })

  it('Selects a sibling on single click after drilling', () => {
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .group(['rect1', 'rect2'], 'groupA')
      .doubleClickShape('rect1')
      .clickShape('rect2')

    expect(state.selectedIds).toStrictEqual(['rect2'])
  })

  it('Selects the group again after selecting a different shape', () => {
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .selectAll()
      .group(['rect1', 'rect2'], 'groupA')
      .doubleClickShape('rect1')
      .clickShape('rect3')
      .clickShape('rect1')

    expect(state.selectedIds).toStrictEqual(['groupA'])
  })

  it('Selects grouped text on double click', () => {
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .createShapes({
        id: 'text1',
        type: TLDrawShapeType.Text,
        text: 'Hello world',
      })
      .group(['rect1', 'rect2', 'text1'], 'groupA')
      .doubleClickShape('text1')

    expect(state.selectedIds).toStrictEqual(['text1'])
    expect(state.pageState.editingId).toBeUndefined()
  })

  it('Edits grouped text on double click after selecting', () => {
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .createShapes({
        id: 'text1',
        type: TLDrawShapeType.Text,
        text: 'Hello world',
      })
      .group(['rect1', 'rect2', 'text1'], 'groupA')
      .doubleClickShape('text1')
      .doubleClickShape('text1')

    expect(state.selectedIds).toStrictEqual(['text1'])
    expect(state.pageState.editingId).toBe('text1')
  })
})
