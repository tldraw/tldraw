import type { UI_EVENT } from '../types'

// Will be placed in global scope by extension
declare function acquireVsCodeApi(): {
  postMessage(options: { type: UI_EVENT; text?: string }): void
}

export const vscode = acquireVsCodeApi()
