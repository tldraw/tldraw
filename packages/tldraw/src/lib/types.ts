import { TLPage, TLPageState, TLSettings } from '@tldraw/core'
import { TLDrawShape, ShapeStyles, ShapeType } from './shape'

export interface TLDrawDocument {
  id: string
  pages: Record<string, TLPage<TLDrawShape>>
  pageStates: Record<string, TLPageState>
}

export interface TLDrawSettings extends TLSettings {
  isReadonlyMode: boolean
  nudgeDistanceSmall: number
  nudgeDistanceLarge: number
}

export interface Data {
  page: TLPage<TLDrawShape>
  pageState: TLPageState
  settings: TLDrawSettings
  appState: {
    currentStyle: ShapeStyles
    currentPageId: string
    activeTool: ShapeType | 'select'
    isToolLocked: boolean
    isStyleOpen: boolean
    isEmptyCanvas: boolean
  }
}

export enum MoveType {
  Backward,
  Forward,
  ToFront,
  ToBack,
}

export enum AlignType {
  Top,
  CenterVertical,
  Bottom,
  Left,
  CenterHorizontal,
  Right,
}

export enum StretchType {
  Horizontal,
  Vertical,
}

export enum DistributeType {
  Horizontal,
  Vertical,
}
