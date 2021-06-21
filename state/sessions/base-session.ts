/* eslint-disable @typescript-eslint/no-unused-vars */
import { Data } from 'types'

export default class BaseSession {
  constructor(data: Data) {
    null
  }

  update(data: Data, ...args: unknown[]): void {
    // Update the state
  }

  complete(data: Data, ...args: unknown[]): void {
    // Create a command
  }

  cancel(data: Data): void {
    // Clean up the change
  }
}
