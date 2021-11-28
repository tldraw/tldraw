import { Utils } from '@tldraw/core'
import type { TDPage } from '~types'
import { action, makeAutoObservable } from 'mobx'

export class Page implements TDPage {
  id
  name
  shapes
  bindings

  constructor(opts = {} as Partial<TDPage>) {
    const { id, name, shapes, bindings } = { ...opts, ...Page.defaultProps }
    this.id = id
    this.name = name
    this.shapes = shapes
    this.bindings = bindings
    makeAutoObservable(this)
  }

  @action update = (change: Partial<TDPage>) => {
    Object.assign(this, change)
  }

  static defaultProps: TDPage = {
    id: Utils.uniqueId(),
    name: 'page',
    shapes: {},
    bindings: {},
  }
}
