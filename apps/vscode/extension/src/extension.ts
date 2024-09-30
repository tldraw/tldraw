import { watch } from 'fs'
import path from 'path'
import * as vscode from 'vscode'
import { TldrawEditorProvider } from './TldrawEditorProvider'
import { nicelog } from './utils'

export function activate(context: vscode.ExtensionContext) {
	try {
		if (process.env.NODE_ENV !== 'production') {
			const extensionWatcher = watch(
				__dirname + '/extension.js',
				{ persistent: false },
				(eventType, filename) => {
					nicelog('reloading[%s]', eventType, filename)
					extensionWatcher.close()
					vscode.commands.executeCommand('workbench.action.reloadWindow')
				}
			)
			const dirname = path.dirname(__dirname)
			const editorpath = dirname.slice(0, dirname.lastIndexOf(path.sep))
			const editorWatcher = watch(
				editorpath + '/editor/index.js',
				{ persistent: false },
				(eventType, filename) => {
					nicelog('reloading[%s]', eventType, filename)
					editorWatcher.close()
					vscode.commands.executeCommand('workbench.action.reloadWindow')
				}
			)
		}

		context.subscriptions.push(TldrawEditorProvider.register(context))
	} catch (e) {
		console.error(e)
	}
}
