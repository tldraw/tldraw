import { isEqual } from 'lodash'
import * as vscode from 'vscode'
import { TLDrawDocument } from './TldrawDocument'
import { loadFile } from './file'

import { UnknownRecord } from 'tldraw'
// @ts-ignore
import type { VscodeMessage } from '../../messages'
import { unfurl } from './unfurl'
import { nicelog } from './utils'

export const GlobalStateKeys = {
	ShowV1FileOpenWarning: 'showV1fileOpenWarning',
	UserId: 'userId',
}

export class WebViewMessageHandler {
	multiplayerOmitKeys = /^(user_presence:|camera:|user:|user_document:|instance:)/
	newDocumentOmitKeys = /^(user_presence:|camera:|user:|user_document:|instance:|document:|page:)/

	constructor(
		private document: TLDrawDocument,
		private webviewPanel: vscode.WebviewPanel,
		private context: vscode.ExtensionContext,
		private userId: unknown,
		private assetSrc: string
	) {}

	isLoaded = false
	firstChangeDone = false

	handle = async (e: VscodeMessage) => {
		if (!this.document) return

		switch (e.type) {
			case 'vscode:ready-to-receive-file': {
				// Send the initial document content to bootstrap the Tldraw/Tldraw component.
				this.webviewPanel.webview.postMessage({
					type: 'vscode:opened-file',
					data: {
						fileContents: JSON.stringify(this.document.documentData),
						uri: this.document.uri.toString(),
						userId: this.userId,
						assetSrc: this.assetSrc,
						isDarkMode:
							this.document.isBlankDocument &&
							(vscode.window.activeColorTheme.kind === 2 ||
								vscode.window.activeColorTheme.kind === 3),
					},
				} as VscodeMessage)
				break
			}
			case 'vscode:open-window': {
				vscode.env.openExternal(vscode.Uri.parse(e.data.url))
				break
			}
			case 'vscode:undo': {
				vscode.commands.executeCommand('undo')
				break
			}
			case 'vscode:redo': {
				vscode.commands.executeCommand('redo')
				break
			}
			case 'vscode:refresh-page': {
				vscode.commands.executeCommand('workbench.action.reloadWindow')
				break
			}
			case 'vscode:hard-reset': {
				await this.document.loadBlankDocument()
				vscode.commands.executeCommand('workbench.action.reloadWindow')
				break
			}
			case 'vscode:bookmark/request': {
				const url = e.data.url
				await unfurl(url)
					.then(async (json: any) => {
						this.webviewPanel.webview.postMessage({
							type: 'vscode:bookmark/response',
							// Add a suffix to the uuid to represent the response.
							uuid: e.uuid + '_response',
							data: {
								url,
								title: json.title,
								description: json.description,
								image: json.image,
								favicon: json.favicon,
							},
						})
					})
					.catch((error: any) => {
						this.webviewPanel.webview.postMessage({
							type: 'vscode:bookmark/error',
							data: {
								error: error.toString(),
							},
						})
					})
				break
			}
			case 'vscode:editor-loaded': {
				this.isLoaded = true
				break
			}
			case 'vscode:v1-file-opened': {
				const showV1FileOpenWarning = this.context.globalState.get(
					GlobalStateKeys.ShowV1FileOpenWarning
				)

				if (!showV1FileOpenWarning) return

				const { backup, open, description, dontAskAgain } = e.data
				vscode.window
					.showInformationMessage(description, open, dontAskAgain, backup)
					.then((result) => {
						if (result === backup) {
							this.document.v1Backup(e.data.backupSaved, e.data.backupFailed)
						} else if (result === dontAskAgain) {
							this.context.globalState.update(GlobalStateKeys.ShowV1FileOpenWarning, false)
						}
					})
				break
			}
			case 'vscode:editor-updated': {
				if (!this.isLoaded) return

				if (!this.firstChangeDone) {
					this.firstChangeDone = true
					return
				}

				const raw = e.data.fileContents
				if (!raw) return

				// The event will contain the new TDFile as JSON.
				const nextFile = loadFile(raw)
				const existingDoc = this.document.documentData

				let isSame = false

				if (existingDoc?.records?.length > 0) {
					const oldDoc = this.omit(existingDoc.records, this.multiplayerOmitKeys)
					const newDoc = this.omit(nextFile.records, this.multiplayerOmitKeys)
					isSame = isEqual(oldDoc, newDoc)
				} else {
					const newDoc = this.omit(nextFile.records, this.newDocumentOmitKeys)
					isSame = isEqual(newDoc, [])
				}

				if (!isSame) {
					this.document.makeEdit(nextFile)
				}
				break
			}
			case 'vscode:hide-v1-file-open-warning': {
				this.context.globalState.update(GlobalStateKeys.ShowV1FileOpenWarning, false)
				break
			}
			case 'vscode:cancel-v1-migrate': {
				vscode.commands.executeCommand('workbench.action.closeActiveEditor')
				break
			}
		}
	}

	private omit = (records: UnknownRecord[], keys: RegExp) => {
		return records.filter((record) => {
			return !record.id.match(keys)
		})
	}

	findDiff(oldDoc: Record<string, any>, newDoc: Record<string, any>) {
		const newRecords = Object.values(newDoc)
		const oldRecords = Object.values(oldDoc)

		for (const oldRecord of oldRecords) {
			const newRecord = newRecords.find((r: any) => r.id === oldRecord.id)
			if (!newRecord) {
				nicelog('record missing in new doc', oldRecord)
				continue
			} else {
				if (!isEqual(oldRecord, newRecord)) {
					nicelog('record different', oldRecord, newRecord)
					continue
				}
			}
		}
		for (const newRecord of newRecords) {
			const oldRecord = oldRecords.find((r: any) => r.id === newRecord.id)
			if (!oldRecord) {
				nicelog('record missing in oldDoc doc', newRecord)
				continue
			} else {
				if (!isEqual(newRecord, oldRecord)) {
					nicelog('record different', newRecord, oldRecord)
					continue
				}
			}
		}
	}
}
