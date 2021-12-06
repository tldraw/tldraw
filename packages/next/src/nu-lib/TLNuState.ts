/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TLNuApp, TLNuShape, TLNuTool } from '~nu-lib'
import type {
  TLNuBinding,
  TLNuCallbacks,
  TLNuKeyboardHandler,
  TLNuOnEnter,
  TLNuOnExit,
  TLNuPinchHandler,
  TLNuPointerHandler,
  TLNuShortcut,
  TLNuWheelHandler,
} from '~types'

export interface TLNuStateClass<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding,
  T extends TLNuTool<S, B> = TLNuTool<S, B>
> {
  new (props: any): TLNuState<S, B, T>
  id: string
}

export abstract class TLNuState<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding,
  T extends TLNuTool<S, B> = TLNuTool<S, B>
> implements Partial<TLNuCallbacks<S>>
{
  constructor(tool: T) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.stateId = this.constructor['id']
    this.tool = tool
    this.app = tool.app
  }

  static id: string
  static shortcuts = [
    {
      keys: 'Backspace,Delete',
      fn: () => {
        console.log('deleting!')
      },
    },
  ]

  readonly stateId: string
  readonly app: TLNuApp<S, B>
  readonly tool: T

  shortcuts?: TLNuShortcut[]

  onEnter?: TLNuOnEnter<any>
  onExit?: TLNuOnExit<any>

  onWheel?: TLNuWheelHandler<S>
  onPointerDown?: TLNuPointerHandler<S>
  onPointerUp?: TLNuPointerHandler<S>
  onPointerMove?: TLNuPointerHandler<S>
  onPointerEnter?: TLNuPointerHandler<S>
  onPointerLeave?: TLNuPointerHandler<S>
  onKeyDown?: TLNuKeyboardHandler<S>
  onKeyUp?: TLNuKeyboardHandler<S>
  onPinchStart?: TLNuPinchHandler<S>
  onPinch?: TLNuPinchHandler<S>
  onPinchEnd?: TLNuPinchHandler<S>
}
