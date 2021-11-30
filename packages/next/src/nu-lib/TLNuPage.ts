/* eslint-disable @typescript-eslint/no-explicit-any */
import { action, observable, makeObservable } from 'mobx'
import type { TLNuBinding } from '~types'
import type { TLNuShape } from '~nu-lib'

export class TLNuPage<S extends TLNuShape, B extends TLNuBinding> {
  constructor(id: string, name: string, shapes: S[] = [], bindings: B[] = []) {
    this.id = id
    this.name = name
    this.shapes = shapes
    this.bindings = bindings
    makeObservable(this)
  }

  @observable id: string

  @observable name: string

  @observable shapes: S[]

  @observable bindings: B[]

  @action addShape(shape: S) {
    this.shapes.push(shape)
  }

  @action removeShape(shape: S) {
    this.shapes.splice(this.shapes.indexOf(shape), 1)
  }
}
