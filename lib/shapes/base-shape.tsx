import { Bounds, Shape } from "types"

export default interface BaseLibShape<K extends Shape> {
  create(props: Partial<K>): K
  getBounds(this: BaseLibShape<K>, shape: K): Bounds
  hitTest(this: BaseLibShape<K>, shape: K, test: number[]): boolean
  hitTestBounds(this: BaseLibShape<K>, shape: K, bounds: Bounds): boolean
  rotate(this: BaseLibShape<K>, shape: K): K
  translate(this: BaseLibShape<K>, shape: K, delta: number[]): K
  scale(this: BaseLibShape<K>, shape: K, scale: number): K
  stretch(this: BaseLibShape<K>, shape: K, scaleX: number, scaleY: number): K
  render(this: BaseLibShape<K>, shape: K): JSX.Element
}

export function createShape<T extends Shape>(
  shape: BaseLibShape<T>
): BaseLibShape<T> {
  return shape
}
