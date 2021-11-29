/* eslint-disable @typescript-eslint/no-explicit-any */
import { observable, makeObservable } from 'mobx'
import type { TLNuBinding } from '~types'
import type { TLNuShape } from './TLNuShape'

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
}
