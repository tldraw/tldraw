import RBush from 'rbush'
import type { TLNuShape } from '~nu-lib'

export class TLNuBush<S extends TLNuShape = TLNuShape> extends RBush<S> {
  toBBox = (shape: S) => shape.rotatedBounds
}
