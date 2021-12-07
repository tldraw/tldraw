/* eslint-disable @typescript-eslint/no-explicit-any */
import { action, observable, makeObservable, computed } from 'mobx'
import type { TLNuBinding } from '~types'
import type { TLNuSerializedShape, TLNuApp, TLNuShape } from '~nu-lib'

export interface TLNuSerializedPage {
  id: string
  name: string
  shapes: TLNuSerializedShape[]
  bindings: TLNuBinding[]
  nonce?: number
}

export interface TLNuPageProps<S extends TLNuShape, B extends TLNuBinding> {
  id: string
  name: string
  shapes: S[]
  bindings: B[]
}

export class TLNuPage<S extends TLNuShape, B extends TLNuBinding> {
  constructor(app: TLNuApp<S, B>, props = {} as TLNuPageProps<S, B>) {
    const { id, name, shapes = [], bindings = [] } = props
    this.id = id
    this.name = name
    this.shapes = shapes
    this.bindings = bindings
    this.app = app
    makeObservable(this)
  }

  app: TLNuApp<S, B>

  @observable id: string

  @observable name: string

  @observable shapes: S[]

  @observable bindings: B[]

  @action addShapes(...shapes: S[] | TLNuSerializedShape[]) {
    const shapeInstances =
      'shapeId' in shapes[0]
        ? (shapes as S[])
        : (shapes as TLNuSerializedShape[]).map((shape) => {
            const ShapeClass = this.app.getShapeClass(shape.type)
            return new ShapeClass(this.app, shape)
          })

    this.shapes.push(...shapeInstances)
    this.bump()
    this.app.persist()
  }

  @action removeShapes(...shapes: S[] | string[]) {
    if (typeof shapes[0] === 'string') {
      this.shapes = this.shapes.filter((shape) => !(shapes as string[]).includes(shape.id))
    } else {
      this.shapes = this.shapes.filter((shape) => !(shapes as S[]).includes(shape))
    }
    this.bump()
    this.app.persist()
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

  @action update(props: Partial<TLNuPageProps<S, B>>): void {
    Object.assign(this, props)
  }
}
