import { TLNuApp, TLNuPage, TLNuSerializedApp, TLNuShape } from '~nu-lib'
import type { TLNuBinding } from '~types'
import { KeyUtils } from '~utils'

export class TLNuHistory<S extends TLNuShape = TLNuShape, B extends TLNuBinding = TLNuBinding> {
  constructor(app: TLNuApp<S, B>) {
    KeyUtils.registerShortcut('cmd+z,ctrl+z', () => this.undo())
    KeyUtils.registerShortcut('cmd+shift+z,ctrl+shift+z', () => this.redo())
    this.app = app
  }

  app: TLNuApp<S, B>
  stack: TLNuSerializedApp[] = []
  pointer = 0
  isPaused = true

  pause = () => {
    if (this.isPaused) return
    this.isPaused = true
  }

  resume = () => {
    if (!this.isPaused) return
    this.isPaused = false
  }

  reset = () => {
    this.stack = [this.app.serialized]
    this.pointer = 0
    this.resume()

    this.app.notify('persist', null)
  }

  persist = () => {
    if (this.isPaused) return

    const { serialized } = this.app

    if (this.pointer < this.stack.length) {
      this.stack = this.stack.slice(0, this.pointer + 1)
    }

    this.stack.push(serialized)
    this.pointer = this.stack.length - 1

    this.app.notify('persist', null)
  }

  undo = () => {
    if (this.isPaused) return
    if (this.pointer > 0) {
      this.pointer--
      const snapshot = this.stack[this.pointer]
      this.deserialize(snapshot)
    }

    this.app.notify('persist', null)
  }

  redo = () => {
    if (this.isPaused) return
    if (this.pointer < this.stack.length - 1) {
      this.pointer++
      const snapshot = this.stack[this.pointer]
      this.deserialize(snapshot)
    }

    this.app.notify('persist', null)
  }

  deserialize = (snapshot: TLNuSerializedApp) => {
    const { currentPageId, selectedIds, pages } = snapshot
    const wasPaused = this.isPaused

    // Pause the history, to prevent any loops
    this.pause()

    this.app.setCurrentPage(currentPageId)
    this.app.select(...selectedIds)

    const pagesMap = new Map(this.app.pages.map((page) => [page.id, page]))
    const pagesToAdd: TLNuPage<S, B>[] = []

    for (const serializedPage of pages) {
      const page = pagesMap.get(serializedPage.id)

      if (page !== undefined) {
        // Update the page
        const shapesMap = new Map(page.shapes.map((shape) => [shape.id, shape]))
        const shapesToAdd: S[] = []

        for (const serializedShape of serializedPage.shapes) {
          const shape = shapesMap.get(serializedShape.id)

          if (shape !== undefined) {
            // Update the shape
            if (shape.nonce !== serializedShape.nonce) {
              shape.update(serializedShape)
            }
            shapesMap.delete(serializedShape.id)
          } else {
            // Create the shape
            const ShapeClass = this.app.getShapeClass(serializedShape.type)
            shapesToAdd.push(new ShapeClass(this.app, serializedShape) as S)
          }
        }

        // Any shapes remaining in the shapes map need to be removed
        if (shapesMap.size > 0) page.removeShapes(...shapesMap.values())

        // Add any new shapes
        if (shapesToAdd.length > 0) page.addShapes(...shapesToAdd)

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
              const ShapeClass = this.app.getShapeClass(serializedShape.type)
              return new ShapeClass(this.app, serializedShape)
            }) as S[],
          })
        )
      }
    }

    // Any pages remaining in the pages map need to be removed
    if (pagesMap.size > 0) this.app.removePages(...pagesMap.values())

    // Add any new pages
    if (pagesToAdd.length > 0) this.app.addPages(...pagesToAdd)

    // Resume the history if not originally paused
    if (!wasPaused) this.resume()
  }
}
