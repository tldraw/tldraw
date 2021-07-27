/* eslint-disable @typescript-eslint/no-unused-vars */
import { Data } from '../../../types'
import { Command } from '../../commands'

export interface BaseSession {
  update(data: Data, ...args: unknown[]): void

  complete(data: Data, ...args: unknown[]): Command | void

  cancel(data: Data): void
}
