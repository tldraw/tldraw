/* eslint-disable @typescript-eslint/ban-types */
import type { TLPage, TLPageState } from '@tldraw/core'
import type {
  ShapeStyles,
  TLDrawShape,
  TLDrawShapeType,
  TLDrawToolType,
  TLDrawBinding,
} from '../shape'
import type { TLDrawSettings } from '../types'
import type { StoreApi } from 'zustand'

export type TLStore = StoreApi<Data>
export type TLChange = Data

export interface Data {
  page: TLPage<TLDrawShape, TLDrawBinding>
  pageState: TLPageState
  settings: TLDrawSettings
  appState: {
    selectedStyle: ShapeStyles
    currentStyle: ShapeStyles
    currentPageId: string
    pages: Pick<TLPage<TLDrawShape, TLDrawBinding>, 'id' | 'name' | 'childIndex'>[]
    hoveredId?: string
    activeTool: TLDrawShapeType | 'select'
    activeToolType?: TLDrawToolType | 'select'
    isToolLocked: boolean
    isStyleOpen: boolean
    isEmptyCanvas: boolean
  }
}
export interface PagePartial {
  shapes: DeepPartial<Data['page']['shapes']>
  bindings: DeepPartial<Data['page']['bindings']>
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
  start: (data: Readonly<Data>, ...args: any[]) => Partial<Data>
  update: (data: Readonly<Data>, ...args: any[]) => Partial<Data>
  complete: (data: Readonly<Data>, ...args: any[]) => Partial<Data> | Command
  cancel: (data: Readonly<Data>, ...args: any[]) => Partial<Data>
}

export type TLDrawStatus =
  | 'idle'
  | 'pointingHandle'
  | 'pointingBounds'
  | 'pointingBoundsHandle'
  | 'translatingHandle'
  | 'translating'
  | 'transforming'
  | 'rotating'
  | 'pinching'
  | 'brushing'
  | 'creating'
  | 'editing-text'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ParametersExceptFirst<F> = F extends (arg0: any, ...rest: infer R) => any ? R : never

export {}
