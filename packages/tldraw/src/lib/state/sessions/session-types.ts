/* eslint-disable @typescript-eslint/no-unused-vars */
import { Data } from '../../types'
import { TLDrawState } from '../state'

export interface BaseSession {
  update(data: Data, ...args: unknown[]): void

  complete(data: Data, ...args: unknown[]): void

  cancel(data: Data): void
}
