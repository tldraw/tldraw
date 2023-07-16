import { parseAndLoadDocument, useDefaultHelpers, useEditor } from '@tldraw/tldraw'
import React from 'react'
import { vscode } from './utils/vscode'

export function FileOpen({
	fileContents,
	forceDarkMode,
}: {
	fileContents: string
	forceDarkMode: boolean
}) {
	const editor = useEditor()
	const { msg, addToast, clearToasts } = useDefaultHelpers()
	const [isFileLoaded, setIsFileLoaded] = React.useState(false)

	React.useEffect(() => {
		if (isFileLoaded) return
		function onV1FileLoad() {
			vscode.postMessage({
				type: 'vscode:v1-file-opened',
				data: {
					description: msg('vscode.file-open.desc'),
					backup: msg('vscode.file-open.backup'),
					backupSaved: msg('vscode.file-open.backup-saved'),
					backupFailed: msg('vscode.file-open.backup-failed'),
					dontAskAgain: msg('vscode.file-open.dont-show-again'),
					open: msg('vscode.file-open.open'),
				},
			})
		}

		async function loadFile() {
			await parseAndLoadDocument(editor, fileContents, msg, addToast, onV1FileLoad, forceDarkMode)
		}

		loadFile()
		setIsFileLoaded(true)
		return () => {
			clearToasts()
		}
	}, [fileContents, editor, addToast, msg, clearToasts, forceDarkMode, isFileLoaded])

	return null
}
