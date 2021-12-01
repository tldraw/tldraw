/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TLNuApp, TLNuShape, TLNuTool } from '~nu-lib'
import type {
  TLNuBinding,
  TLNuCallbacks,
  TLNuKeyboardHandler,
  TLNuOnEnter,
  TLNuOnExit,
  TLNuPointerHandler,
  TLNuWheelHandler,
} from '~types'

export interface TLNuStateClass<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding
> {
  new (props: any): TLNuState<S, B>
  id: string
}

export abstract class TLNuState<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding
> implements Partial<TLNuCallbacks<S>>
{
  constructor(tool: TLNuTool<S, B>) {
    this.tool = tool
    this.app = tool.app
  }

  static id: string

  readonly app: TLNuApp<S, B>
  readonly tool: TLNuTool<S, B>

  onEnter?: TLNuOnEnter<any>
  onExit?: TLNuOnExit<any>

  onPan?: TLNuWheelHandler<S>
  onPointerDown?: TLNuPointerHandler<S>
  onPointerUp?: TLNuPointerHandler<S>
  onPointerMove?: TLNuPointerHandler<S>
  onPointerEnter?: TLNuPointerHandler<S>
  onPointerLeave?: TLNuPointerHandler<S>
  onKeyDown?: TLNuKeyboardHandler<S>
  onKeyUp?: TLNuKeyboardHandler<S>

  get stateId(): string {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return this.constructor['id']
  }
}
