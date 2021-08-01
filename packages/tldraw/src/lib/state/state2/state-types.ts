/* eslint-disable @typescript-eslint/ban-types */
import type {
  AlignType,
  DistributeType,
  StretchType,
  TLCallbacks,
  TLKeyboardInfo,
  TLPage,
  TLPageState,
  TLPointerInfo,
} from '@tldraw/core'
import { ShapeStyles, TLDrawShape, TLDrawShapeType, TLDrawToolType } from '../../shape'
import { TLDrawDocument, TLDrawSettings } from '../../types'
import { StoreApi } from 'zustand'

export type TLStore = StoreApi<Data>
export type TLChange = Data

export interface Data {
  page: TLPage<TLDrawShape>
  pageState: TLPageState
  settings: TLDrawSettings
  appState: {
    currentStyle: ShapeStyles
    currentPageId: string
    activeTool: TLDrawShapeType | 'select'
    activeToolType?: TLDrawToolType | 'select'
    isToolLocked: boolean
    isStyleOpen: boolean
    isEmptyCanvas: boolean
  }
}

export type DeepPartial<T> = T extends Function
  ? T
  : T extends object
  ? T extends unknown[]
    ? DeepPartial<T[number]>[]
    : { [P in keyof T]?: DeepPartial<T[P]> }
  : T

export interface Command {
  id: string
  before: DeepPartial<Data>
  after: DeepPartial<Data>
}

export interface History {
  pointer: number
  stack: Command[]
}

export interface Session {
  id: string
  start: (data: Readonly<Data>, ...args: unknown[]) => TLChange
  update: (data: Readonly<Data>, ...args: unknown[]) => TLChange
  complete: (data: Readonly<Data>, ...args: unknown[]) => TLChange | Command
  cancel: (data: Readonly<Data>, ...args: unknown[]) => TLChange
}

export type TLDrawStatus = 'idle' | 'pointed' | 'dragging' | 'pinching' | 'brushing'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ParametersExceptFirst<F> = F extends (arg0: any, ...rest: infer R) => any ? R : never

export interface TLDrawState extends TLCallbacks<TLDrawState> {
  currentDocumentId: string
  currentPageId: string
  pages: Record<string, TLPage<TLDrawShape>>
  pageStates: Record<string, TLPageState>
  session?: Session
  status: {
    previous: TLDrawStatus
    current: TLDrawStatus
  }
  store: StoreApi<Data>
  history: History
  /* -------------------- Document -------------------- */
  loadDocument: (this: TLDrawState, document: TLDrawDocument) => void
  setCurrentPageId: (this: TLDrawState, pageId: string) => void
  /* --------------------- Status --------------------- */
  setStatus: (this: TLDrawState, status: TLDrawStatus) => void
  /* ---------------------- Tools --------------------- */
  selectTool: (this: TLDrawState, tool: TLDrawShapeType | 'select') => void
  /* -------------------- Selection ------------------- */
  setSelectedIds: (this: TLDrawState, ids: string[]) => void
  selectAll: (this: TLDrawState) => void
  deselectAll: (this: TLDrawState) => void
  /* ----------------- Shape Functions ---------------- */
  toggleStylePanel: (this: TLDrawState) => void
  copy: (this: TLDrawState) => void
  paste: (this: TLDrawState) => void
  copyToSvg: (this: TLDrawState) => void
  align: (this: TLDrawState, type: AlignType) => void
  distribute: (this: TLDrawState, type: DistributeType) => void
  stretch: (this: TLDrawState, type: StretchType) => void
  // rotate: (this: TLDrawState) => void
  // move: (this: TLDrawState) => void
  /* --------------------- Camera --------------------- */
  zoomIn: (this: TLDrawState) => void
  zoomOut: (this: TLDrawState) => void
  resetCamera: (this: TLDrawState) => void
  zoomToFit: (this: TLDrawState) => void
  zoomToSelection: (this: TLDrawState) => void
  zoom: (this: TLDrawState, zoomDelta: number) => void
  pinchZoom: (this: TLDrawState, point: number[], delta: number[], zoomDelta: number) => void
  pan: (this: TLDrawState, delta: number[]) => void
  /* -------------------- Sessions -------------------- */
  startSession: <T extends Session>(
    this: TLDrawState,
    session: T,
    ...args: ParametersExceptFirst<T['start']>
  ) => void
  updateSession: <T extends Session>(
    this: TLDrawState,
    ...args: ParametersExceptFirst<T['update']>
  ) => void
  cancelSession: <T extends Session>(
    this: TLDrawState,
    ...args: ParametersExceptFirst<T['cancel']>
  ) => void
  breakSession: <T extends Session>(
    this: TLDrawState,
    ...args: ParametersExceptFirst<T['cancel']>
  ) => void
  completeSession: <T extends Session>(
    this: TLDrawState,
    ...args: ParametersExceptFirst<T['complete']>
  ) => void
  // Specific
  startBrushSession: (this: TLDrawState, point: number[]) => void
  updateBrushSession: (this: TLDrawState, point: number[]) => void
  /* -------------------- Commands -------------------- */
  do: (this: TLDrawState, command: Command) => void
  undo: (this: TLDrawState) => void
  redo: (this: TLDrawState) => void
}
