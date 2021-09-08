import * as vscode from 'vscode'
import { TldrawEditorProvider } from './tldraw-editor'

export function activate(context: vscode.ExtensionContext) {
  // Register our custom editor providers
  context.subscriptions.push(TldrawEditorProvider.register(context))
}
