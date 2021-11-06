import * as vscode from 'vscode'
import { TldrawEditorProvider } from './tldraw-editor'

// This is the extension entry point. This is called once on the first
// time a .tldr extension is opened/created.
export function activate(context: vscode.ExtensionContext) {
  // Register our custom editor providers
  context.subscriptions.push(TldrawEditorProvider.register(context))
}
