import { Utils } from '@tldraw/core'

export class TLDrawMutables {
  selectedIds: string[] = []
  center: number[] = [0, 0]
  originPoint: number[] = [0, 0]
  currentPoint: number[] = [0, 0]
  previousPoint: number[] = [0, 0]
  viewport = Utils.getBoundsFromPoints([
    [0, 0],
    [100, 100],
  ])
  rendererBounds = Utils.getBoundsFromPoints([
    [0, 0],
    [100, 100],
  ])
  shiftKey = false
  altKey = false
  metaKey = false
  ctrlKey = false
  spaceKey = false

  reset() {
    Object.assign(this, TLDrawMutables.defaultMutables)
  }

  static defaultMutables = {
    selectedIds: [],
    center: [0, 0],
    originPoint: [0, 0],
    currentPoint: [0, 0],
    previousPoint: [0, 0],
    viewport: Utils.getBoundsFromPoints([
      [0, 0],
      [100, 100],
    ]),
    rendererBounds: Utils.getBoundsFromPoints([
      [0, 0],
      [100, 100],
    ]),
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ctrlKey: false,
    spaceKey: false,
  }
}
