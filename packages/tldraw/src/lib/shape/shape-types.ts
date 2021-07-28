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
}

export interface TLDrawBaseShape extends TLShape {
  style: ShapeStyles
  type: TLDrawShapeType
}

export interface EllipseShape extends TLDrawBaseShape {
  type: TLDrawShapeType.Ellipse
  radius: number[]
}

export interface RectangleShape extends TLDrawBaseShape {
  type: TLDrawShapeType.Rectangle
  size: number[]
  radius?: number
}

export type TLDrawShape = RectangleShape | EllipseShape

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

export type PropsOfType<T extends TLDrawShape, U> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof T]: T[K] extends any ? (T[K] extends U ? K : never) : never
}[keyof T]

export type Theme = 'dark' | 'light'
