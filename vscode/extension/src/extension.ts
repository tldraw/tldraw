import * as vscode from 'vscode'
import { TldrawEditorProvider } from './TldrawEditorProvider'

// When a .tldr is first opened or created, activate the extension.
export function activate(context: vscode.ExtensionContext) {
  try {
    context.subscriptions.push(TldrawEditorProvider.register(context))
  } catch (e) {
    console.error(e)
  }
}
