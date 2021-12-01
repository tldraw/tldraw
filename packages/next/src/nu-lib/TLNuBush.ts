import RBush from 'rbush'
import type { TLNuShape } from '~nu-lib'
import type { TLNuBinding } from '~types'

export class TLNuBush<S extends TLNuShape, B extends TLNuBinding> extends RBush<S> {
  toBBox = (shape: S) => shape.bounds
}
