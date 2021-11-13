import * as vscode from 'vscode'
import { TLDrawEditorProvider } from './TLDrawEditorProvider'

// When a .tldr is first opened or created, activate the extension.
export function activate(context: vscode.ExtensionContext) {
  try {
    context.subscriptions.push(TLDrawEditorProvider.register(context))
  } catch (e) {
    console.log(e)
  }
}
