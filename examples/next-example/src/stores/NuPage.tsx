/* eslint-disable @typescript-eslint/no-explicit-any */
import { BoundsUtils, TLNuBinding, TLNuBounds, TLNuPage } from '@tldraw/next'
import Vec from '@tldraw/vec'
import { action, observable, makeObservable, computed } from 'mobx'
import { NuBoxShape } from './NuBoxShape'

export class NuPage extends TLNuPage<NuBoxShape> {
  @observable id = 'page'
  @observable name = 'Page'
  @observable shapes = {
    box1: new NuBoxShape({ id: 'box1' }),
  }
  @observable bindings: Record<string, TLNuBinding> = {}
  @observable selectedIds: string[] = []
  @observable hoveredId: string | null = null
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

  @computed get shapesArr(): NuBoxShape[] {
    return Object.values(this.shapes)
  }

  @computed get hoveredShape(): NuBoxShape | undefined {
    return this.hoveredId ? this.shapesArr.find((shape) => shape.id === this.hoveredId) : undefined
  }

  @computed get selectedShapes(): NuBoxShape[] {
    return this.shapesArr.filter((shape) => this.selectedIds.includes(shape.id))
  }

  @computed get selectedBounds(): TLNuBounds {
    return BoundsUtils.getCommonBounds(this.selectedShapes.map((shape) => shape.bounds))
  }
}
