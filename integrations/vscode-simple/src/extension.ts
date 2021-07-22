import * as vscode from 'vscode'
import { TldrawEditorProvider } from './editor-provider'

export function activate(context: vscode.ExtensionContext) {
  // Register our custom editor provider
  context.subscriptions.push(TldrawEditorProvider.register(context))
}
