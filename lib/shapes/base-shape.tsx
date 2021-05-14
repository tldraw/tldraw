import { Bounds, Shape } from "types"

export default interface ShapeUtil<K extends Shape> {
  create(props: Partial<K>): K
  getBounds(this: ShapeUtil<K>, shape: K): Bounds
  hitTest(this: ShapeUtil<K>, shape: K, test: number[]): boolean
  hitTestBounds(this: ShapeUtil<K>, shape: K, bounds: Bounds): boolean
  rotate(this: ShapeUtil<K>, shape: K): K
  translate(this: ShapeUtil<K>, shape: K, delta: number[]): K
  scale(this: ShapeUtil<K>, shape: K, scale: number): K
  stretch(this: ShapeUtil<K>, shape: K, scaleX: number, scaleY: number): K
  render(this: ShapeUtil<K>, shape: K): JSX.Element
}

export function createShape<T extends Shape>(
  shape: ShapeUtil<T>
): ShapeUtil<T> {
  return shape
}
