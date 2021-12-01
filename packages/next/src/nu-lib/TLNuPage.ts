/* eslint-disable @typescript-eslint/no-explicit-any */
import { action, observable, makeObservable } from 'mobx'
import type { TLNuBinding } from '~types'
import type { TLNuApp, TLNuShape, TLNuShapeProps } from '~nu-lib'

interface SerializedPage {
  id: string
  name: string
  shapes: (TLNuShapeProps & { type: string })[]
  bindings: TLNuBinding[]
}

export interface TLNuPageProps<S extends TLNuShape, B extends TLNuBinding> {
  id: string
  name: string
  shapes: S[]
  bindings: B[]
}

export class TLNuPage<S extends TLNuShape, B extends TLNuBinding> {
  app: TLNuApp<S, B>

  constructor(app: TLNuApp<S, B>, props = {} as TLNuPageProps<S, B>) {
    const { id, name, shapes = [], bindings = [] } = props
    this.id = id
    this.name = name
    this.shapes = shapes
    this.bindings = bindings
    this.app = app
    makeObservable(this)
  }

  @observable id: string

  @observable name: string

  @observable shapes: S[]

  @observable bindings: B[]

  @action addShapes(...shapes: S[]) {
    this.shapes.push(...shapes)
    this.app.persist()
  }

  @action removeShapes(...shapes: S[]) {
    this.shapes = this.shapes.filter((shape) => !shapes.includes(shape))
    this.app.persist()
  }

  serialize(): SerializedPage {
    return {
      id: this.id,
      name: this.name,
      shapes: this.shapes.map((shape) => shape.serialize()),
      bindings: this.bindings.map((binding) => ({ ...binding })),
    }
  }

  getShapesMap() {
    return new Map(this.shapes.map((shape) => [shape.id, shape]))
  }
}
