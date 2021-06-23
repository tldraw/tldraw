/* eslint-disable @typescript-eslint/no-unused-vars */
import { Data } from 'types'

export default abstract class BaseSession {
  constructor(data: Data) {
    null
  }

  update(data: Data, ...args: unknown[]): void {
    null
  }

  complete(data: Data, ...args: unknown[]): void {
    null
  }

  cancel(data: Data): void {
    null
  }
}
