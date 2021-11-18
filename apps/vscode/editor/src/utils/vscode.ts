import type { MessageFromWebview } from '../types'

// Will be placed in global scope by extension
declare function acquireVsCodeApi(): {
  postMessage(options: MessageFromWebview): void
}

export const vscode = acquireVsCodeApi()
