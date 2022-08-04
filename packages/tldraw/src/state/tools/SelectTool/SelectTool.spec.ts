import { mockDocument, TldrawTestApp } from '~test'
import { SessionType, TDShapeType } from '~types'
import { SelectTool } from '.'

describe('SelectTool', () => {
  it('creates tool', () => {
    const app = new TldrawTestApp()
    new SelectTool(app)
  })
})

describe('When double clicking link controls', () => {
  const doc = new TldrawTestApp()
    .createShapes(
      {
        id: 'rect1',
        type: TDShapeType.Rectangle,
        point: [0, 0],
        size: [100, 100],
      },
      {
        id: 'rect2',
        type: TDShapeType.Rectangle,
        point: [200, 0],
        size: [100, 100],
      },
      {
        id: 'rect3',
        type: TDShapeType.Rectangle,
        point: [400, 0],
        size: [100, 100],
      },
      {
        id: 'arrow1',
        type: TDShapeType.Arrow,
        point: [200, 200],
      },
      {
        id: 'arrow2',
        type: TDShapeType.Arrow,
        point: [210, 210],
      }
    )
    .select('arrow1')
    .movePointer({ x: 200, y: 200 })
    .startSession(SessionType.Arrow, 'arrow1', 'start')
    .movePointer({ x: 50, y: 50 })
    .completeSession()
    .movePointer({ x: 200, y: 200 })
    .startSession(SessionType.Arrow, 'arrow1', 'end')
    .movePointer({ x: 250, y: 50 })
    .completeSession()
    .select('arrow2')
    .movePointer({ x: 200, y: 200 })
    .startSession(SessionType.Arrow, 'arrow2', 'start')
    .movePointer({ x: 250, y: 50 })
    .completeSession()
    .movePointer({ x: 200, y: 200 })
    .startSession(SessionType.Arrow, 'arrow2', 'end')
    .movePointer({ x: 450, y: 50 })
    .completeSession()
    .selectNone().document

  it('moves all linked shapes when center is dragged', () => {
    const app = new TldrawTestApp()
      .loadDocument(doc)
      .select('rect2')
      .pointBoundsHandle('center', [100, 100])
      .expectShapesToBeAtPoints({
        rect1: [0, 0],
        rect2: [200, 0],
        rect3: [400, 0],
      })

    app.movePointer([200, 200]).expectShapesToBeAtPoints({
      rect1: [100, 100],
      rect2: [300, 100],
      rect3: [500, 100],
    })

    app.completeSession().undo()

    app.expectShapesToBeAtPoints({
      rect1: [0, 0],
      rect2: [200, 0],
      rect3: [400, 0],
    })
  })

  it('moves all upstream shapes when center is dragged', () => {
    const app = new TldrawTestApp()
      .loadDocument(doc)
      .select('rect2')
      .pointBoundsHandle('center')
      .movePointer({ x: 100, y: 100 })

    expect(app.getShape('rect1').point).toEqual([100, 100])
    expect(app.getShape('rect2').point).toEqual([300, 100])
    expect(app.getShape('rect3').point).toEqual([500, 100])
  })

  it('moves all downstream shapes when center is dragged', () => {
    const app = new TldrawTestApp()
      .loadDocument(doc)
      .select('rect2')
      .pointBoundsHandle('right')
      .movePointer({ x: 100, y: 100 })

    expect(app.getShape('rect1').point).toEqual([0, 0])
    expect(app.getShape('rect2').point).toEqual([300, 100])
    expect(app.getShape('rect3').point).toEqual([500, 100])
  })

  it('selects all linked shapes when center is double clicked', () => {
    new TldrawTestApp()
      .loadDocument(doc)
      .select('rect2')
      .doubleClickBoundHandle('center')
      .expectSelectedIdsToBe(['rect2', 'rect1', 'rect3'])
  })

  it('selects all linked shapes and arrows when center is double clicked while holding shift', () => {
    new TldrawTestApp()
      .loadDocument(doc)
      .select('rect2')
      .doubleClickBoundHandle('center', { shiftKey: true })
      .expectSelectedIdsToBe(['rect2', 'rect1', 'rect3', 'arrow1', 'arrow2'])
  })

  it('selects all upstream linked shapes when left is double clicked', () => {
    new TldrawTestApp()
      .loadDocument(doc)
      .select('rect2')
      .doubleClickBoundHandle('left')
      .expectSelectedIdsToBe(['rect1', 'rect2'])
  })

  it('selects all upstream linked shapes and arrows when left is double clicked with shift', () => {
    new TldrawTestApp()
      .loadDocument(doc)
      .select('rect2')
      .doubleClickBoundHandle('left', { shiftKey: true })
      .expectSelectedIdsToBe(['rect1', 'rect2', 'arrow1'])
  })

  it('selects all downstream linked shapes when right is double clicked', () => {
    new TldrawTestApp()
      .loadDocument(doc)
      .select('rect2')
      .doubleClickBoundHandle('right')
      .expectSelectedIdsToBe(['rect2', 'rect3'])
  })

  it('selects all downstream linked shapes and arrows when right is double clicked with shift', () => {
    new TldrawTestApp()
      .loadDocument(doc)
      .select('rect2')
      .doubleClickBoundHandle('right', { shiftKey: true })
      .expectSelectedIdsToBe(['rect2', 'rect3', 'arrow2'])
  })
})

describe('When selecting grouped shapes', () => {
  it('Selects the group on single click', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .group(['rect1', 'rect2'], 'groupA')

      .clickShape('rect1')

    expect(app.selectedIds).toStrictEqual(['groupA'])
  })

  it('Drills in and selects the child on double click', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .group(['rect1', 'rect2'], 'groupA')
      .doubleClickShape('rect1')

    expect(app.selectedIds).toStrictEqual(['rect1'])
  })

  it('Selects a sibling on single click after drilling', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .group(['rect1', 'rect2'], 'groupA')
      .doubleClickShape('rect1')
      .clickShape('rect2')

    expect(app.selectedIds).toStrictEqual(['rect2'])
  })

  it('Selects the group again after selecting a different shape', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .selectAll()
      .group(['rect1', 'rect2'], 'groupA')
      .doubleClickShape('rect1')
      .clickShape('rect3')
      .clickShape('rect1')

    expect(app.selectedIds).toStrictEqual(['groupA'])
  })

  it('Selects grouped text on double click', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .createShapes({
        id: 'text1',
        type: TDShapeType.Text,
        text: 'Hello world',
      })
      .group(['rect1', 'rect2', 'text1'], 'groupA')
      .doubleClickShape('text1')

    expect(app.selectedIds).toStrictEqual(['text1'])
    expect(app.pageState.editingId).toBeUndefined()
  })

  it('Edits grouped text on double click after selecting', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .createShapes({
        id: 'text1',
        type: TDShapeType.Text,
        text: 'Hello world',
      })
      .group(['rect1', 'rect2', 'text1'], 'groupA')
      .doubleClickShape('text1')
      .doubleClickShape('text1')

    expect(app.selectedIds).toStrictEqual(['text1'])
    expect(app.pageState.editingId).toBe('text1')
  })
})
