import { TLShape, TLShapeUtil } from '@tldraw/core'

export enum TLDrawToolType {
  Draw = 'draw',
  Bounds = 'bounds',
  Point = 'point',
  Points = 'points',
}

export enum TLDrawShapeType {
  Ellipse = 'ellipse',
  Rectangle = 'rectangle',
  Draw = 'draw',
}

export interface TLDrawBaseShape extends TLShape {
  style: ShapeStyles
  type: TLDrawShapeType
}

export interface DrawShape extends TLDrawBaseShape {
  type: TLDrawShapeType.Draw
  points: number[][]
}

export interface EllipseShape extends TLDrawBaseShape {
  type: TLDrawShapeType.Ellipse
  radius: number[]
}

export interface RectangleShape extends TLDrawBaseShape {
  type: TLDrawShapeType.Rectangle
  size: number[]
}

export type TLDrawShape = RectangleShape | EllipseShape | DrawShape

export abstract class TLDrawShapeUtil<T extends TLDrawShape> extends TLShapeUtil<T> {
  abstract toolType: TLDrawToolType
}

export type TLDrawShapeUtils = Record<string, TLDrawShapeUtil<TLDrawShape>>

export enum ColorStyle {
  White = 'White',
  LightGray = 'LightGray',
  Gray = 'Gray',
  Black = 'Black',
  Green = 'Green',
  Cyan = 'Cyan',
  Blue = 'Blue',
  Indigo = 'Indigo',
  Violet = 'Violet',
  Red = 'Red',
  Orange = 'Orange',
  Yellow = 'Yellow',
}

export enum SizeStyle {
  Small = 'Small',
  Medium = 'Medium',
  Large = 'Large',
}

export enum DashStyle {
  Draw = 'Draw',
  Solid = 'Solid',
  Dashed = 'Dashed',
  Dotted = 'Dotted',
}

export enum FontSize {
  Small = 'Small',
  Medium = 'Medium',
  Large = 'Large',
  ExtraLarge = 'ExtraLarge',
}

export type ShapeStyles = {
  color: ColorStyle
  size: SizeStyle
  dash: DashStyle
  isFilled?: boolean
  scale?: number
}

export type PropsOfType<U> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof TLDrawShape]: TLDrawShape[K] extends any
    ? TLDrawShape[K] extends U
      ? K
      : never
    : never
}[keyof TLDrawShape]

export type Theme = 'dark' | 'light'
