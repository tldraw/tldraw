import { MoveType, ShapeType } from 'types'
import TestState from './test-utils'

describe('shapes with children', () => {
  const tt = new TestState()

  tt.resetDocumentState()
    .createShape(
      {
        type: ShapeType.Rectangle,
        point: [0, 0],
        size: [100, 100],
        childIndex: 1,
      },
      'delete-me-bottom'
    )
    .createShape(
      {
        type: ShapeType.Rectangle,
        point: [0, 0],
        size: [100, 100],
        childIndex: 2,
      },
      '1'
    )
    .createShape(
      {
        type: ShapeType.Rectangle,
        point: [300, 0],
        size: [100, 100],
        childIndex: 3,
      },
      '2'
    )
    .createShape(
      {
        type: ShapeType.Rectangle,
        point: [0, 300],
        size: [100, 100],
        childIndex: 4,
      },
      'delete-me-middle'
    )
    .createShape(
      {
        type: ShapeType.Rectangle,
        point: [0, 300],
        size: [100, 100],
        childIndex: 5,
      },
      '3'
    )
    .createShape(
      {
        type: ShapeType.Rectangle,
        point: [300, 300],
        size: [100, 100],
        childIndex: 6,
      },
      '4'
    )

  // Delete shapes at the start and in the middle of the list

  tt.clickShape('delete-me-bottom')
    .send('DELETED')
    .clickShape('delete-me-middle')
    .send('DELETED')

  it('has shapes in order', () => {
    expect(
      Object.values(tt.data.document.pages[tt.data.currentParentId].shapes)
        .sort((a, b) => a.childIndex - b.childIndex)
        .map((shape) => shape.childIndex)
    ).toStrictEqual([2, 3, 5, 6])
  })

  it('moves a shape to back', () => {
    tt.clickShape('3').send('MOVED', {
      type: MoveType.ToBack,
    })

    expect(
      Object.values(tt.data.document.pages[tt.data.currentParentId].shapes)
        .sort((a, b) => a.childIndex - b.childIndex)
        .map((shape) => shape.id)
    ).toStrictEqual(['3', '1', '2', '4'])
  })

  it('moves two adjacent siblings to back', () => {
    tt.clickShape('4').clickShape('2', { shiftKey: true }).send('MOVED', {
      type: MoveType.ToBack,
    })

    expect(
      Object.values(tt.data.document.pages[tt.data.currentParentId].shapes)
        .sort((a, b) => a.childIndex - b.childIndex)
        .map((shape) => shape.id)
    ).toStrictEqual(['2', '4', '3', '1'])
  })

  it('moves two non-adjacent siblings to back', () => {
    tt.clickShape('4').clickShape('1', { shiftKey: true }).send('MOVED', {
      type: MoveType.ToBack,
    })

    expect(
      Object.values(tt.data.document.pages[tt.data.currentParentId].shapes)
        .sort((a, b) => a.childIndex - b.childIndex)
        .map((shape) => shape.id)
    ).toStrictEqual(['4', '1', '2', '3'])
  })

  it('moves a shape backward', () => {
    tt.clickShape('3').send('MOVED', {
      type: MoveType.Backward,
    })

    expect(
      Object.values(tt.data.document.pages[tt.data.currentParentId].shapes)
        .sort((a, b) => a.childIndex - b.childIndex)
        .map((shape) => shape.id)
    ).toStrictEqual(['4', '1', '3', '2'])
  })

  it('moves a shape at first index backward', () => {
    tt.clickShape('4').send('MOVED', {
      type: MoveType.Backward,
    })

    expect(
      Object.values(tt.data.document.pages[tt.data.currentParentId].shapes)
        .sort((a, b) => a.childIndex - b.childIndex)
        .map((shape) => shape.id)
    ).toStrictEqual(['4', '1', '3', '2'])
  })

  it('moves two adjacent siblings backward', () => {
    tt.clickShape('3').clickShape('2', { shiftKey: true }).send('MOVED', {
      type: MoveType.Backward,
    })

    expect(
      Object.values(tt.data.document.pages[tt.data.currentParentId].shapes)
        .sort((a, b) => a.childIndex - b.childIndex)
        .map((shape) => shape.id)
    ).toStrictEqual(['4', '3', '2', '1'])
  })

  it('moves two non-adjacent siblings backward', () => {
    tt.clickShape('3').clickShape('1', { shiftKey: true }).send('MOVED', {
      type: MoveType.Backward,
    })

    expect(
      Object.values(tt.data.document.pages[tt.data.currentParentId].shapes)
        .sort((a, b) => a.childIndex - b.childIndex)
        .map((shape) => shape.id)
    ).toStrictEqual(['3', '4', '1', '2'])
  })

  it('moves two adjacent siblings backward at zero index', () => {
    tt.clickShape('3').clickShape('4', { shiftKey: true }).send('MOVED', {
      type: MoveType.Backward,
    })

    expect(
      Object.values(tt.data.document.pages[tt.data.currentParentId].shapes)
        .sort((a, b) => a.childIndex - b.childIndex)
        .map((shape) => shape.id)
    ).toStrictEqual(['3', '4', '1', '2'])
  })

  it('moves a shape forward', () => {
    tt.clickShape('4').send('MOVED', {
      type: MoveType.Forward,
    })

    expect(
      Object.values(tt.data.document.pages[tt.data.currentParentId].shapes)
        .sort((a, b) => a.childIndex - b.childIndex)
        .map((shape) => shape.id)
    ).toStrictEqual(['3', '1', '4', '2'])
  })

  it('moves a shape forward at the top index', () => {
    tt.clickShape('2').send('MOVED', {
      type: MoveType.Forward,
    })

    expect(
      Object.values(tt.data.document.pages[tt.data.currentParentId].shapes)
        .sort((a, b) => a.childIndex - b.childIndex)
        .map((shape) => shape.id)
    ).toStrictEqual(['3', '1', '4', '2'])
  })

  it('moves two adjacent siblings forward', () => {
    tt.deselectAll()
      .clickShape('4')
      .clickShape('1', { shiftKey: true })
      .send('MOVED', {
        type: MoveType.Forward,
      })

    expect(tt.idsAreSelected(['1', '4'])).toBe(true)

    expect(
      Object.values(tt.data.document.pages[tt.data.currentParentId].shapes)
        .sort((a, b) => a.childIndex - b.childIndex)
        .map((shape) => shape.id)
    ).toStrictEqual(['3', '2', '1', '4'])
  })

  it('moves two non-adjacent siblings forward', () => {
    tt.deselectAll()
      .clickShape('3')
      .clickShape('1', { shiftKey: true })
      .send('MOVED', {
        type: MoveType.Forward,
      })

    expect(
      Object.values(tt.data.document.pages[tt.data.currentParentId].shapes)
        .sort((a, b) => a.childIndex - b.childIndex)
        .map((shape) => shape.id)
    ).toStrictEqual(['2', '3', '4', '1'])
  })

  it('moves two adjacent siblings forward at top index', () => {
    tt.deselectAll()
      .clickShape('3')
      .clickShape('1', { shiftKey: true })
      .send('MOVED', {
        type: MoveType.Forward,
      })
    expect(
      Object.values(tt.data.document.pages[tt.data.currentParentId].shapes)
        .sort((a, b) => a.childIndex - b.childIndex)
        .map((shape) => shape.id)
    ).toStrictEqual(['2', '4', '3', '1'])
  })

  it('moves a shape to front', () => {
    tt.deselectAll().clickShape('2').send('MOVED', {
      type: MoveType.ToFront,
    })

    expect(
      Object.values(tt.data.document.pages[tt.data.currentParentId].shapes)
        .sort((a, b) => a.childIndex - b.childIndex)
        .map((shape) => shape.id)
    ).toStrictEqual(['4', '3', '1', '2'])
  })

  it('moves two adjacent siblings to front', () => {
    tt.deselectAll()
      .clickShape('3')
      .clickShape('1', { shiftKey: true })
      .send('MOVED', {
        type: MoveType.ToFront,
      })

    expect(
      Object.values(tt.data.document.pages[tt.data.currentParentId].shapes)
        .sort((a, b) => a.childIndex - b.childIndex)
        .map((shape) => shape.id)
    ).toStrictEqual(['4', '2', '3', '1'])
  })

  it('moves two non-adjacent siblings to front', () => {
    tt.deselectAll()
      .clickShape('4')
      .clickShape('3', { shiftKey: true })
      .send('MOVED', {
        type: MoveType.ToFront,
      })

    expect(
      Object.values(tt.data.document.pages[tt.data.currentParentId].shapes)
        .sort((a, b) => a.childIndex - b.childIndex)
        .map((shape) => shape.id)
    ).toStrictEqual(['2', '1', '4', '3'])
  })

  it('moves siblings already at front to front', () => {
    tt.deselectAll()
      .clickShape('4')
      .clickShape('3', { shiftKey: true })
      .send('MOVED', {
        type: MoveType.ToFront,
      })

    expect(
      Object.values(tt.data.document.pages[tt.data.currentParentId].shapes)
        .sort((a, b) => a.childIndex - b.childIndex)
        .map((shape) => shape.id)
    ).toStrictEqual(['2', '1', '4', '3'])
  })
})
