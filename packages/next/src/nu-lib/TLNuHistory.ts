import { TLNuApp, TLNuPage, TLNuShape, TLNuShapeProps } from '~nu-lib'
import type { TLNuBinding } from '~types'
import { KeyUtils } from '~utils'

interface SerializedPage {
  id: string
  name: string
  shapes: (TLNuShapeProps & { type: string })[]
  bindings: TLNuBinding[]
}

interface SerializedState {
  currentPageId: string
  selectedIds: string[]
  pages: SerializedPage[]
}

export class TLNuHistory<S extends TLNuShape = TLNuShape, B extends TLNuBinding = TLNuBinding> {
  app: TLNuApp<S, B>
  stack: SerializedState[] = []
  pointer = 0
  isPaused = true

  constructor(app: TLNuApp<S, B>) {
    KeyUtils.registerShortcut('cmd+z,ctrl+z', () => this.undo())
    KeyUtils.registerShortcut('cmd+shift+z,ctrl+shift+z', () => this.redo())
    this.app = app
  }

  pause = () => {
    this.isPaused = true
  }

  resume = () => {
    this.isPaused = false
  }

  reset = () => {
    this.stack = [this.getSnapshot()]
    this.pointer = 0
    this.resume()
  }

  getSnapshot = (): SerializedState => {
    const { currentPageId, selectedIds, pages } = this.app

    return {
      currentPageId: currentPageId,
      selectedIds: selectedIds,
      pages: pages.map((page) => page.serialize()),
    }
  }

  persist = () => {
    if (this.isPaused) return

    const { currentPageId, selectedIds, pages } = this.app

    const snapshot = {
      currentPageId: currentPageId,
      selectedIds: selectedIds,
      pages: pages.map((page) => page.serialize()),
    }

    if (this.pointer < this.stack.length) {
      this.stack = this.stack.slice(0, this.pointer + 1)
    }
    this.stack.push(snapshot)
    this.pointer = this.stack.length - 1
  }

  undo = () => {
    if (this.isPaused) return
    if (this.pointer > 0) {
      this.pointer--
      const snapshot = this.stack[this.pointer]
      this.deserialize(snapshot)
    }
  }

  redo = () => {
    if (this.isPaused) return
    if (this.pointer < this.stack.length - 1) {
      this.pointer++
      const snapshot = this.stack[this.pointer]
      this.deserialize(snapshot)
    }
  }

  deserialize = (snapshot: SerializedState) => {
    const { currentPageId, selectedIds, pages } = snapshot
    this.pause()

    this.app.setCurrentPageId(currentPageId)
    this.app.select(...selectedIds)

    pages.forEach((serializedPage) => {
      const page = this.app.pages.find((page) => page.id === serializedPage.id)
      if (page !== undefined) {
        serializedPage.shapes.forEach((serializedShape) => {
          const shape = page.shapes.find((shape) => shape.id === serializedShape.id)
          if (shape) {
            shape.update(serializedShape)
          } else {
            const ShapeClass = this.app.shapes[serializedShape.type]
            page.addShape(new ShapeClass(serializedShape) as S)
          }
        })
      } else {
        const { id, name, shapes, bindings } = serializedPage

        this.app.addPage(
          new TLNuPage<S, B>(this.app, {
            id,
            name,
            bindings: bindings as B[],
            shapes: shapes.map((serializedShape) => {
              const ShapeClass = this.app.shapes[serializedShape.type]
              return new ShapeClass(serializedShape)
            }) as S[],
          })
        )
      }
    })

    this.resume()
  }
}
