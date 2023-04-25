// @ts-ignore
import type { VscodeMessage } from '../../../messages'

// Will be placed in global scope by extension
declare function acquireVsCodeApi(): {
	postMessage(options: VscodeMessage): void
}

export const vscode = acquireVsCodeApi()
