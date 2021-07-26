import { TLPage, TLPageState, TLSettings } from '@tldraw/core'
import { TLDrawShape } from './shapes'

export interface TLDrawDocument {
  currentPageId: string
  pages: Record<string, TLPage<TLDrawShape>>
  pageStates: Record<string, TLPageState>
}

export interface Data {
  settings: TLSettings
  page: TLPage<TLDrawShape>
  pageState: TLPageState
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
