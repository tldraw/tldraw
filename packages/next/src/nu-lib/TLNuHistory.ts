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
    if (this.isPaused) return
    this.isPaused = true
  }

  resume = () => {
    if (!this.isPaused) return
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

    // Pause the history, to prevent any loops
    this.pause()

    this.app.setCurrentPageId(currentPageId)
    this.app.select(...selectedIds)

    const pagesMap = this.app.getPagesMap()
    const pagesToAdd: TLNuPage<S, B>[] = []

    for (const serializedPage of pages) {
      const page = pagesMap.get(serializedPage.id)

      if (page !== undefined) {
        // Update the page
        const shapesMap = page.getShapesMap()
        const shapesToAdd: S[] = []

        for (const serializedShape of serializedPage.shapes) {
          const shape = shapesMap.get(serializedShape.id)

          if (shape !== undefined) {
            // Update the shape
            shape.update(serializedShape)
            shapesMap.delete(serializedShape.id)
          } else {
            // Create the shape
            const ShapeClass = this.app.shapes[serializedShape.type]
            shapesToAdd.push(new ShapeClass(serializedShape) as S)
          }
        }

        if (shapesMap.size > 0) {
          // Any shapes remaining in the shapes map need to be removed
          page.removeShapes(...shapesMap.values())
        }

        // Add any new shapes
        page.addShapes(...shapesToAdd)

        // Remove the page from the map
        pagesMap.delete(serializedPage.id)
      } else {
        // Create the page
        const { id, name, shapes, bindings } = serializedPage

        pagesToAdd.push(
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
    }

    if (pagesMap.size > 0) {
      // Any pages remaining in the pages map need to be removed
      this.app.removePages(...pagesMap.values())
    }

    // Add any new pages
    this.app.addPages(...pagesToAdd)

    // Resume the history
    this.resume()
  }
}
