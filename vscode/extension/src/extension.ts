import * as vscode from 'vscode'
import { TLDrawEditorProvider } from './TLDrawEditorProvider'

// This is the extension entry point. This is called once on the first
// time a .tldr extension is opened/created.
export function activate(context: vscode.ExtensionContext) {
  // Register our custom editor providers
  context.subscriptions.push(TLDrawEditorProvider.register(context))
}
