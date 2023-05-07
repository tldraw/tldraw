import { TLInstanceId, TLUserId, useApp } from '@tldraw/editor'
import { parseAndLoadDocument } from '@tldraw/file-format'
import { useDefaultHelpers } from '@tldraw/ui'
import React from 'react'
import { vscode } from './utils/vscode'

export function FileOpen({
	userId,
	fileContents,
	instanceId,
	forceDarkMode,
}: {
	instanceId: TLInstanceId
	userId: TLUserId
	fileContents: string
	forceDarkMode: boolean
}) {
	const app = useApp()
	const { msg, addToast, clearToasts } = useDefaultHelpers()
	const [isFileLoaded, setFileLoaded] = React.useState(false)

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
			await parseAndLoadDocument(app, fileContents, msg, addToast, onV1FileLoad, forceDarkMode)
		}

		loadFile()
		setFileLoaded(true)
		return () => {
			clearToasts()
		}
	}, [
		fileContents,
		app,
		userId,
		instanceId,
		addToast,
		msg,
		clearToasts,
		forceDarkMode,
		isFileLoaded,
	])

	return null
}
