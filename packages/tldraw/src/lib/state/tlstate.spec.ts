import { inputs, TLBoundsEdge, TLBoundsCorner } from '@tldraw/core'
import { TLDrawState } from './tlstate'
import { mockDocument } from './test-helpers'

const tlstate = new TLDrawState()

interface PointerOptions {
  id?: number
  x?: number
  y?: number
  shiftKey?: boolean
  altKey?: boolean
  ctrlKey?: boolean
}

function getPoint(options: PointerOptions = {} as PointerOptions): PointerEvent {
  const { id = 1, x = 0, y = 0, shiftKey = false, altKey = false, ctrlKey = false } = options

  return {
    shiftKey,
    altKey,
    ctrlKey,
    pointerId: id,
    clientX: x,
    clientY: y,
  } as any
}

function pointCanvas(options: PointerOptions = {}) {
  tlstate.onPointCanvas(inputs.pointerDown(getPoint(options), 'canvas'), {} as React.PointerEvent)
}

function pointShape(id: string, options: PointerOptions = {}) {
  tlstate.onPointShape(inputs.pointerDown(getPoint(options), id), {} as React.PointerEvent)
}

function doubleClickShape(id: string, options: PointerOptions = {}) {
  tlstate.onDoubleClickShape(inputs.pointerDown(getPoint(options), id), {} as React.PointerEvent)
}

function pointBounds(options: PointerOptions = {}) {
  tlstate.onPointBounds(inputs.pointerDown(getPoint(options), 'bounds'), {} as React.PointerEvent)
}

function pointBoundsHandle(
  id: TLBoundsCorner | TLBoundsEdge | 'rotate',
  options: PointerOptions = {},
) {
  tlstate.onPointBounds(inputs.pointerDown(getPoint(options), 'bounds'), {} as React.PointerEvent)
}

function stopPointing(target = 'canvas', options: PointerOptions = {}) {
  tlstate.onPointerUp(inputs.pointerDown(getPoint(options), target), {} as React.PointerEvent)
}

function clickCanvas(options: PointerOptions = {}) {
  pointCanvas(options)
  stopPointing()
}

function clickShape(id: string, options: PointerOptions = {}) {
  pointShape(id, options)
  stopPointing(id, options)
}

function clickBounds(options: PointerOptions = {}) {
  pointBounds(options)
  stopPointing()
}

function clickBoundsHandle(
  id: TLBoundsCorner | TLBoundsEdge | 'rotate',
  options: PointerOptions = {},
) {
  pointBoundsHandle(id, options)
  stopPointing(id)
}

describe('Selection', () => {
  tlstate.loadDocument(mockDocument)

  it('selects a shape', () => {
    tlstate.deselectAll()
    clickShape('rect1')
    expect(tlstate.selectedIds).toStrictEqual(['rect1'])
    expect(tlstate.status.current).toBe('idle')
  })

  it('selects and deselects a shape', () => {
    tlstate.deselectAll()
    clickShape('rect1')
    clickCanvas()
    expect(tlstate.selectedIds).toStrictEqual([])
    expect(tlstate.status.current).toBe('idle')
  })

  it('selects multiple shapes', () => {
    tlstate.deselectAll()
    clickShape('rect1')
    clickShape('rect2', { shiftKey: true })
    expect(tlstate.selectedIds).toStrictEqual(['rect1', 'rect2'])
    expect(tlstate.status.current).toBe('idle')
  })

  it('shift-selects to deselect shapes', () => {
    tlstate.deselectAll()
    clickShape('rect1')
    clickShape('rect2', { shiftKey: true })
    expect(tlstate.selectedIds).toStrictEqual(['rect1', 'rect2'])
    clickShape('rect2', { shiftKey: true })
    expect(tlstate.selectedIds).toStrictEqual(['rect1'])
    expect(tlstate.status.current).toBe('idle')
  })

  it('clears selection when clicking bounds', () => {
    tlstate.deselectAll()
    tlstate.startBrushSession([-10, -10])
    tlstate.updateBrushSession([110, 110])
    tlstate.completeSession()
    expect(tlstate.selectedIds.length).toBe(3)
  })

  it('does not select selected shape when single-clicked', () => {
    tlstate.selectAll()
    clickShape('rect2')
    expect(tlstate.selectedIds).toStrictEqual(['rect1', 'rect2', 'rect3'])
  })

  it('selects shape when double-clicked', () => {
    tlstate.selectAll()
    doubleClickShape('rect2')
    expect(tlstate.selectedIds).toStrictEqual(['rect2'])
  })

  it('does not select on meta-click', () => {
    tlstate.deselectAll()
    clickShape('rect1', { ctrlKey: true })
    expect(tlstate.selectedIds).toStrictEqual([])
    expect(tlstate.status.current).toBe('idle')
  })

  it('does not select on meta-shift-click', () => {
    tlstate.deselectAll()
    clickShape('rect1', { ctrlKey: true, shiftKey: true })
    expect(tlstate.selectedIds).toStrictEqual([])
    expect(tlstate.status.current).toBe('idle')
  })

  // Single click on a selected shape to select just that shape

  // it('single-selects shape in selection on click', () => {
  //   tlstate.deselectAll()
  //   clickShape('rect1')
  //   clickShape('rect2', { shiftKey: true })
  //   clickShape('rect2')
  //   expect(tlstate.selectedIds).toStrictEqual(['rect2'])
  //   expect(tlstate.status.current).toBe('idle')
  // })

  // it('single-selects shape in selection on pointerup only', () => {
  //   tlstate.deselectAll()
  //   clickShape('rect1')
  //   clickShape('rect2', { shiftKey: true })
  //   pointShape('rect2')
  //   expect(tlstate.selectedIds).toStrictEqual(['rect1', 'rect2'])
  //   stopPointing('rect2')
  //   expect(tlstate.selectedIds).toStrictEqual(['rect2'])
  //   expect(tlstate.status.current).toBe('idle')
  // })

  // it('selects shapes if shift key is lifted before pointerup', () => {
  //   tlstate.deselectAll()
  //   clickShape('rect1')
  //   pointShape('rect2', { shiftKey: true })
  //   expect(tlstate.status.current).toBe('pointingBounds')
  //   stopPointing('rect2')
  //   expect(tlstate.selectedIds).toStrictEqual(['rect2'])
  //   expect(tlstate.status.current).toBe('idle')
  // })
})
