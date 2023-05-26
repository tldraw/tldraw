import { SyncedStore, TLInstanceId, useApp } from '@tldraw/editor'
import { parseAndLoadDocument, serializeTldrawJson } from '@tldraw/file-format'
import { useDefaultHelpers } from '@tldraw/ui'
import { debounce } from '@tldraw/utils'
import React from 'react'
import '../public/index.css'
import { vscode } from './utils/vscode'

// @ts-ignore
import type { VscodeMessage } from '../../messages'

export const ChangeResponder = ({
	syncedStore,
	instanceId,
}: {
	syncedStore: SyncedStore
	instanceId: TLInstanceId
}) => {
	const app = useApp()
	const { addToast, clearToasts, msg } = useDefaultHelpers()

	React.useEffect(() => {
		// When a message is received from the VS Code extension, handle it
		function handleMessage({ data: message }: MessageEvent<VscodeMessage>) {
			switch (message.type) {
				// case 'vscode:undo': {
				// 	app.undo()
				// 	break
				// }
				// case 'vscode:redo': {
				// 	app.redo()
				// 	break
				// }
				case 'vscode:revert': {
					parseAndLoadDocument(app, message.data.fileContents, msg, addToast)
					break
				}
			}
		}

		window.addEventListener('message', handleMessage)

		return () => {
			clearToasts()
			window.removeEventListener('message', handleMessage)
		}
	}, [app, instanceId, msg, addToast, clearToasts])

	React.useEffect(() => {
		// When the history changes, send the new file contents to VSCode
		const handleChange = debounce(async () => {
			if (syncedStore.store) {
				vscode.postMessage({
					type: 'vscode:editor-updated',
					data: {
						fileContents: await serializeTldrawJson(syncedStore.store),
					},
				})
			}
		}, 250)

		vscode.postMessage({
			type: 'vscode:editor-loaded',
		})

		app.on('change-history', handleChange)

		return () => {
			handleChange()
			app.off('change-history', handleChange)
		}
	}, [app, syncedStore, instanceId])

	return null
}
