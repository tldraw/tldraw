import { Vec } from '@tldraw/vec'
import { TLNuApp, TLNuSelectTool, TLNuShape, TLNuToolState } from '~nu-lib'
import type { TLNuBinding, TLNuKeyboardHandler, TLNuPointerHandler, TLNuWheelHandler } from '~types'
import { uniqueId } from '~utils'

export class TranslatingShapesState<
  S extends TLNuShape,
  B extends TLNuBinding,
  R extends TLNuApp<S, B>,
  P extends TLNuSelectTool<S, B, R>
> extends TLNuToolState<S, B, R, P> {
  static id = 'translatingShapes'

  private isCloning = false
  private didClone = false
  private initialPoints: Record<string, number[]> = {}
  private initialShapePoints: Record<string, number[]> = {}
  private initialClonePoints: Record<string, number[]> = {}
  private clones: S[] = []

  private moveSelectedShapesToPointer() {
    const {
      selectedShapes,
      inputs: { shiftKey, originPoint, currentPoint },
    } = this.app

    const { initialPoints } = this

    const delta = Vec.sub(currentPoint, originPoint)

    if (shiftKey) {
      if (Math.abs(delta[0]) < Math.abs(delta[1])) {
        delta[0] = 0
      } else {
        delta[1] = 0
      }
    }

    selectedShapes.forEach((shape) =>
      shape.update({ point: Vec.add(initialPoints[shape.id], delta) })
    )
  }

  private startCloning() {
    if (!this.didClone) {
      // Create the clones
      this.clones = this.app.selectedShapes.map((shape) => {
        const ShapeClass = this.app.getShapeClass(shape.shapeId)
        if (!ShapeClass) throw Error('Could not find that shape class.')
        return new ShapeClass({
          ...shape.serialized,
          id: uniqueId(),
          type: shape.type,
          point: this.initialPoints[shape.id],
          rotation: shape.rotation,
        })
      })

      this.initialClonePoints = Object.fromEntries(
        this.clones.map(({ id, point }) => [id, point.slice()])
      )

      this.didClone = true
    }

    // Move shapes back to their start positions
    this.app.selectedShapes.forEach((shape) => {
      shape.update({ point: this.initialPoints[shape.id] })
    })

    // Set the initial points to the original clone points
    this.initialPoints = this.initialClonePoints

    // Add the clones to the page
    this.app.currentPage.addShapes(...this.clones)

    // Select the clones
    this.app.select(...Object.keys(this.initialClonePoints))

    // Move the clones to the pointer
    this.moveSelectedShapesToPointer()

    this.isCloning = true

    this.moveSelectedShapesToPointer()
  }

  onEnter = () => {
    // Pause the history when we enter
    this.app.history.pause()

    // Set initial data
    const { selectedShapes, inputs } = this.app

    this.initialShapePoints = Object.fromEntries(
      selectedShapes.map(({ id, point }) => [id, point.slice()])
    )
    this.initialPoints = this.initialShapePoints

    if (inputs.altKey) {
      this.startCloning()
    } else {
      this.moveSelectedShapesToPointer()
    }
  }

  onExit = () => {
    // Resume the history when we exit
    this.app.history.resume()

    // Reset initial data
    this.didClone = false
    this.isCloning = false
    this.clones = []
    this.initialPoints = {}
    this.initialShapePoints = {}
    this.initialClonePoints = {}
  }

  onWheel: TLNuWheelHandler<S> = (info, gesture, e) => {
    this.onPointerMove(info, e)
  }

  onPointerMove: TLNuPointerHandler<S> = () => {
    this.moveSelectedShapesToPointer()
  }

  onPointerUp: TLNuPointerHandler<S> = () => {
    this.app.history.resume()
    this.app.persist()
    this.tool.transition('idle')
  }

  onKeyDown: TLNuKeyboardHandler<S> = (info, e) => {
    switch (e.key) {
      case 'Alt': {
        this.startCloning()
        break
      }
      case 'Escape': {
        this.app.selectedShapes.forEach((shape) => {
          shape.update({ point: this.initialPoints[shape.id] })
        })
        this.tool.transition('idle')
        break
      }
    }
  }

  onKeyUp: TLNuKeyboardHandler<S> = (info, e) => {
    switch (e.key) {
      case 'Alt': {
        if (!this.isCloning) throw Error('Expected to be cloning.')

        const { currentPage, selectedShapes } = this.app

        // Remove the selected shapes (our clones)
        currentPage.removeShapes(...selectedShapes)

        // Set the initial points to the original shape points
        this.initialPoints = this.initialShapePoints

        // Select the original shapes again
        this.app.select(...Object.keys(this.initialPoints))

        // Move the original shapes to the pointer
        this.moveSelectedShapesToPointer()

        this.isCloning = false
        break
      }
    }
  }
}
