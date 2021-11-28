// import type { TLSnapLine } from '@tldraw/core'
// import { ShapeStyles, TDPage, TDStatus, TDToolType } from '~types'
// import { action, makeAutoObservable } from 'mobx'
// import { defaultStyle } from '~state/shapes/shared'

// interface TDAppState {
//   currentStyle: ShapeStyles
//   currentPageId: string
//   hoveredId?: string
//   activeTool: TDToolType
//   isToolLocked: boolean
//   isStyleOpen: boolean
//   isEmptyCanvas: boolean
//   status: string
//   snapLines: TLSnapLine[]
// }

// export class AppState implements TDAppState {
//   currentStyle
//   currentPageId
//   hoveredId
//   activeTool
//   isToolLocked
//   isStyleOpen
//   isEmptyCanvas
//   status
//   snapLines

//   constructor(opts = {} as Partial<TDAppState>) {
//     const {
//       currentStyle,
//       currentPageId,
//       hoveredId,
//       activeTool,
//       isToolLocked,
//       isStyleOpen,
//       isEmptyCanvas,
//       status,
//       snapLines,
//     } = { ...opts, ...AppState.defaultProps }

//     this.currentStyle = currentStyle
//     this.currentPageId = currentPageId
//     this.hoveredId = hoveredId
//     this.activeTool = activeTool
//     this.isToolLocked = isToolLocked
//     this.isStyleOpen = isStyleOpen
//     this.isEmptyCanvas = isEmptyCanvas
//     this.status = status
//     this.snapLines = snapLines

//     makeAutoObservable(this)
//   }

//   @action update = (change: Partial<TDAppState>) => {
//     Object.assign(this, change)
//   }

//   static defaultProps: TDAppState = {
//     status: TDStatus.Idle,
//     activeTool: 'select',
//     hoveredId: undefined,
//     currentPageId: 'page',
//     currentStyle: defaultStyle,
//     isToolLocked: false,
//     isStyleOpen: false,
//     isEmptyCanvas: false,
//     snapLines: [],
//   }
// }
