import type { TLBoundsEdge, TLBoundsCorner } from '@tldraw/core'
import { inputs } from '@tldraw/core'
import { TLDrawState } from './tlstate'
import { mockDocument } from './test-helpers'

interface PointerOptions {
  id?: number
  x?: number
  y?: number
  shiftKey?: boolean
  altKey?: boolean
  ctrlKey?: boolean
}

class TLStateUtils {
  tlstate: TLDrawState

  constructor(tlstate: TLDrawState) {
    this.tlstate = tlstate
  }

  pointCanvas = (options: PointerOptions = {}) => {
    this.tlstate.onPointCanvas(
      inputs.pointerDown(this.getPoint(options), 'canvas'),
      {} as React.PointerEvent
    )
  }

  pointShape = (id: string, options: PointerOptions = {}) => {
    this.tlstate.onPointShape(
      inputs.pointerDown(this.getPoint(options), id),
      {} as React.PointerEvent
    )
  }

  doubleClickShape = (id: string, options: PointerOptions = {}) => {
    this.tlstate.onDoubleClickShape(
      inputs.pointerDown(this.getPoint(options), id),
      {} as React.PointerEvent
    )
  }

  pointBounds = (options: PointerOptions = {}) => {
    this.tlstate.onPointBounds(
      inputs.pointerDown(this.getPoint(options), 'bounds'),
      {} as React.PointerEvent
    )
  }

  pointBoundsHandle = (
    id: TLBoundsCorner | TLBoundsEdge | 'rotate',
    options: PointerOptions = {}
  ) => {
    this.tlstate.onPointBounds(
      inputs.pointerDown(this.getPoint(options), 'bounds'),
      {} as React.PointerEvent
    )
  }

  stopPointing = (target = 'canvas', options: PointerOptions = {}) => {
    this.tlstate.onPointerUp(
      inputs.pointerDown(this.getPoint(options), target),
      {} as React.PointerEvent
    )
  }

  clickCanvas = (options: PointerOptions = {}) => {
    this.pointCanvas(options)
    this.stopPointing()
  }

  clickShape = (id: string, options: PointerOptions = {}) => {
    this.pointShape(id, options)
    this.stopPointing(id, options)
  }

  clickBounds = (options: PointerOptions = {}) => {
    this.pointBounds(options)
    this.stopPointing()
  }

  clickBoundsHandle = (
    id: TLBoundsCorner | TLBoundsEdge | 'rotate',
    options: PointerOptions = {}
  ) => {
    this.pointBoundsHandle(id, options)
    this.stopPointing(id)
  }

  getPoint(options: PointerOptions = {} as PointerOptions): PointerEvent {
    const {
      id = 1,
      x = 0,
      y = 0,
      shiftKey = false,
      altKey = false,
      ctrlKey = false,
    } = options

    return {
      shiftKey,
      altKey,
      ctrlKey,
      pointerId: id,
      clientX: x,
      clientY: y,
    } as any
  }
}

describe('TLDrawState', () => {
  const tlstate = new TLDrawState()

  const tlu = new TLStateUtils(tlstate)

  describe('Copy and Paste', () => {
    it('copies a shape', () => {
      tlstate.loadDocument(mockDocument).deselectAll().copy(['rect1'])
    })

    it('pastes a shape', () => {
      tlstate.loadDocument(mockDocument)

      const prevCount = Object.keys(tlstate.page.shapes).length

      tlstate.deselectAll().copy(['rect1']).paste()

      expect(Object.keys(tlstate.page.shapes).length).toBe(prevCount + 1)

      tlstate.undo()

      expect(Object.keys(tlstate.page.shapes).length).toBe(prevCount)

      tlstate.redo()

      expect(Object.keys(tlstate.page.shapes).length).toBe(prevCount + 1)
    })
  })

  describe('Selection', () => {
    it('selects a shape', () => {
      tlstate.loadDocument(mockDocument).deselectAll()
      tlu.clickShape('rect1')
      expect(tlstate.selectedIds).toStrictEqual(['rect1'])
      expect(tlstate.status.current).toBe('idle')
    })

    it('selects and deselects a shape', () => {
      tlstate.loadDocument(mockDocument).deselectAll()
      tlu.clickShape('rect1')
      tlu.clickCanvas()
      expect(tlstate.selectedIds).toStrictEqual([])
      expect(tlstate.status.current).toBe('idle')
    })

    it('selects multiple shapes', () => {
      tlstate.loadDocument(mockDocument).deselectAll()
      tlu.clickShape('rect1')
      tlu.clickShape('rect2', { shiftKey: true })
      expect(tlstate.selectedIds).toStrictEqual(['rect1', 'rect2'])
      expect(tlstate.status.current).toBe('idle')
    })

    it('shift-selects to deselect shapes', () => {
      tlstate.loadDocument(mockDocument).deselectAll()
      tlu.clickShape('rect1')
      tlu.clickShape('rect2', { shiftKey: true })
      expect(tlstate.selectedIds).toStrictEqual(['rect1', 'rect2'])
      tlu.clickShape('rect2', { shiftKey: true })
      expect(tlstate.selectedIds).toStrictEqual(['rect1'])
      expect(tlstate.status.current).toBe('idle')
    })

    it('clears selection when clicking bounds', () => {
      tlstate.loadDocument(mockDocument).deselectAll()
      tlstate.startBrushSession([-10, -10])
      tlstate.updateBrushSession([110, 110])
      tlstate.completeSession()
      expect(tlstate.selectedIds.length).toBe(3)
    })

    it('does not select selected shape when single-clicked', () => {
      tlstate.loadDocument(mockDocument).selectAll()
      tlu.clickShape('rect2')
      expect(tlstate.selectedIds).toStrictEqual(['rect1', 'rect2', 'rect3'])
    })

    it('selects shape when double-clicked', () => {
      tlstate.loadDocument(mockDocument).selectAll()
      tlu.doubleClickShape('rect2')
      expect(tlstate.selectedIds).toStrictEqual(['rect2'])
    })

    it('does not select on meta-click', () => {
      tlstate.loadDocument(mockDocument).deselectAll()
      tlu.clickShape('rect1', { ctrlKey: true })
      expect(tlstate.selectedIds).toStrictEqual([])
      expect(tlstate.status.current).toBe('idle')
    })

    it('does not select on meta-shift-click', () => {
      tlstate.loadDocument(mockDocument).deselectAll()
      tlu.clickShape('rect1', { ctrlKey: true, shiftKey: true })
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
})
