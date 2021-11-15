import type { SessionType, TLDrawCommand, TLDrawPatch } from '~types'
import type { TLDrawApp } from '../internal'

export abstract class BaseSession {
  abstract type: SessionType

  constructor(public app: TLDrawApp) {}

  abstract start: () => TLDrawPatch | undefined

  abstract update: () => TLDrawPatch | undefined

  abstract complete: () => TLDrawPatch | TLDrawCommand | undefined

  abstract cancel: () => TLDrawPatch | undefined
}
