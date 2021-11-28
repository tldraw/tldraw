// import { TLPageState, TLBounds, Utils } from '@tldraw/core'
// import { Vec } from '@tldraw/vec'
// import { observable, action, makeObservable } from 'mobx'

// export class PageState implements TLPageState {
//   @observable id
//   @observable selectedIds
//   @observable camera
//   @observable brush?: TLBounds | null
//   @observable pointedId?: string | null
//   @observable hoveredId?: string | null
//   @observable editingId?: string | null
//   @observable bindingId?: string | null

//   constructor(opts = {} as Partial<TLPageState>) {
//     const { id, selectedIds, camera, pointedId, hoveredId, editingId, bindingId } = {
//       ...PageState.defaultProps,
//       ...opts,
//     }

//     this.id = id
//     this.camera = camera
//     this.selectedIds = selectedIds
//     this.pointedId = pointedId
//     this.hoveredId = hoveredId
//     this.editingId = editingId
//     this.bindingId = bindingId
//     makeObservable(this)
//   }

//   @action update = (change: Partial<TLPageState>) => {
//     Object.assign(this, change)
//   }

//   @action setHoveredId = (id: string | undefined) => {
//     this.hoveredId = id
//   }

//   @action setSelectedIds = (id: string) => {
//     if (!this.selectedIds.includes(id)) {
//       this.selectedIds = [id]
//     }
//   }

//   @action clearSelectedIds = () => {
//     this.selectedIds = []
//   }

//   @action pan = (point: number[]) => {
//     this.camera.point = Vec.add(this.camera.point, point)
//   }

//   static defaultProps: TLPageState = {
//     id: Utils.uniqueId(),
//     selectedIds: [],
//     camera: {
//       point: [0, 0],
//       zoom: 1,
//     },
//     pointedId: undefined,
//     hoveredId: undefined,
//     editingId: undefined,
//     bindingId: undefined,
//   }
// }
