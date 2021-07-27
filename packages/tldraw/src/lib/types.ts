import { TLPage, TLPageState, TLSettings } from '@tldraw/core'
import { TLDrawShape, ShapeStyles } from './shape'

export interface TLDrawDocument {
  id: string
  pages: Record<string, TLPage<TLDrawShape>>
  pageStates: Record<string, TLPageState>
}

export interface Data {
  currentPageId: string
  currentStyle: ShapeStyles
  settings: TLSettings
  page: TLPage<TLDrawShape>
  pageState: TLPageState
  ui: {
    isStyleOpen: boolean
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
