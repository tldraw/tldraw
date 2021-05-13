import { Data } from "types"

export default class BaseSession {
  constructor(data: Data) {}

  update(data: Data, ...args: unknown[]) {
    // Update the state
  }

  complete(data: Data, ...args: unknown[]) {
    // Create a command
  }

  cancel(data: Data) {
    // Clean up the change
  }
}
