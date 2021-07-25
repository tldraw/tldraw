/* eslint-disable @typescript-eslint/no-unused-vars */
import { Data } from '../../types'
import { TLDrawState } from '../state'

export interface BaseSession {
  update(state: TLDrawState, data: Data, ...args: unknown[]): void

  complete(state: TLDrawState, data: Data, ...args: unknown[]): void

  cancel(state: TLDrawState, data: Data): void
}
