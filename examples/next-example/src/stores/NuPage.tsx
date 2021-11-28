/* eslint-disable @typescript-eslint/no-explicit-any */
import { TLNuPage } from '@tldraw/next'
import Vec from '@tldraw/vec'
import { action, observable, makeObservable } from 'mobx'
import { NuBoxShape } from './NuBoxShape'

export class NuPage extends TLNuPage<NuBoxShape> {
  @observable id = 'page'
  @observable name = 'Page'
  @observable shapes = {
    box1: new NuBoxShape({ id: 'box1' }),
  }
  @observable bindings = {}
  @observable selectedIds = []
  @observable hoveredId = null
  @observable camera = {
    point: [0, 0],
    zoom: 1,
  }

  constructor() {
    super()
    makeObservable(this)

    setTimeout(() => {
      this.shapes.box1.size = [100, 200]
    }, 1000)
  }

  @action panCamera = (delta: number[]) => {
    this.camera.point = Vec.sub(this.camera.point, delta)
  }
}
