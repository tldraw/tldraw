/* eslint-disable @typescript-eslint/no-explicit-any */
import type { RootStateNode } from './RootStateNode'
import { BaseStateNode } from './BasestateNode'

export class StateNode<
  R extends RootStateNode,
  P extends R | StateNode<R, any>
> extends BaseStateNode {
  constructor(root: R, parent: P) {
    super()
    this._root = root
    this._parent = parent
  }

  private _root: R

  get root() {
    return this._root
  }

  private _parent: P

  get parent() {
    return this._parent
  }
}
