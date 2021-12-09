/* eslint-disable @typescript-eslint/no-explicit-any */
import { action, observable, makeObservable, computed, observe } from 'mobx'
import type { TLNuBinding } from '~types'
import type { TLNuSerializedShape, TLNuApp, TLNuShape } from '~nu-lib'

export interface TLNuSerializedPage {
  id: string
  name: string
  shapes: TLNuSerializedShape[]
  bindings: TLNuBinding[]
  nonce?: number
}

export interface TLNuPageProps<S> {
  id: string
  name: string
  shapes: S[]
  bindings: TLNuBinding[]
}

export class TLNuPage<S extends TLNuShape = TLNuShape> {
  constructor(app: TLNuApp<S>, props = {} as TLNuPageProps<S>) {
    const { id, name, shapes = [], bindings = [] } = props
    this.id = id
    this.name = name
    this.bindings = bindings
    this.app = app
    this.addShapes(...shapes)
    makeObservable(this)
  }

  app: TLNuApp<S>

  @observable id: string

  @observable name: string

  @observable shapes: S[] = []

  @observable bindings: TLNuBinding[]

  @action addShapes(...shapes: S[] | TLNuSerializedShape[]) {
    if (shapes.length === 0) return

    const shapeInstances =
      'getBounds' in shapes[0]
        ? (shapes as S[])
        : (shapes as TLNuSerializedShape[]).map((shape) => {
            const ShapeClass = this.app.getShapeClass(shape.type)
            return new ShapeClass(shape)
          })

    shapeInstances.forEach((instance) => observe(instance, this.app.saveState))

    this.shapes.push(...shapeInstances)
    this.bump()
    this.app.saveState()
  }

  @action removeShapes(...shapes: S[] | string[]) {
    if (typeof shapes[0] === 'string') {
      this.shapes = this.shapes.filter((shape) => !(shapes as string[]).includes(shape.id))
    } else {
      this.shapes = this.shapes.filter((shape) => !(shapes as S[]).includes(shape))
    }
    // this.bump()
    // this.app.persist()
  }

  // TODO: How to avoid making deep copies when shapes have not changed?
  @computed get serialized(): TLNuSerializedPage {
    return {
      id: this.id,
      name: this.name,
      shapes: this.shapes.map((shape) => shape.serialized),
      bindings: this.bindings.map((binding) => ({ ...binding })),
      nonce: this.nonce,
    }
  }

  nonce = 0

  private bump = () => {
    this.nonce++
  }

  @action update(props: Partial<TLNuPageProps<S>>): void {
    Object.assign(this, props)
  }
}
