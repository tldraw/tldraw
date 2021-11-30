/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TLNuApp, TLNuShape, TLNuTool } from '~nu-lib'
import type {
  TLNuBinding,
  TLNuCallbacks,
  TLNuKeyboardHandler,
  TLNuPointerHandler,
  TLNuWheelHandler,
} from '~types'

export abstract class TLNuState<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding
> implements Partial<TLNuCallbacks<S>>
{
  constructor(tool: TLNuTool<S, B>) {
    this.tool = tool
    this.app = tool.app
  }

  abstract readonly id: string
  readonly app: TLNuApp<S, B>
  readonly tool: TLNuTool<S, B>

  onEnter?: (data: any) => void
  onExit?: (data: any) => void

  onPan?: TLNuWheelHandler<S>
  onPointerDown?: TLNuPointerHandler<S>
  onPointerUp?: TLNuPointerHandler<S>
  onPointerMove?: TLNuPointerHandler<S>
  onPointerEnter?: TLNuPointerHandler<S>
  onPointerLeave?: TLNuPointerHandler<S>
  onKeyDown?: TLNuKeyboardHandler<S>
  onKeyUp?: TLNuKeyboardHandler<S>
}
