import { TldrawFile } from '@tldraw/tldraw'
import * as vscode from 'vscode'
import { defaultFileContents, fileExists, loadFile } from './file'
import { nicelog } from './utils'

export type DocumentChangeEventArgs =
	| { reason: 'undo' | 'redo' }
	| {
			reason: 'revert'
			fileContents: TldrawFile
	  }
export class TLDrawDocument implements vscode.CustomDocument {
	isBlankDocument = false
	lastBackupDestination: vscode.Uri | undefined

	private readonly _onDidChangeDocument = new vscode.EventEmitter<DocumentChangeEventArgs>()

	/** Fired to notify webviews that the document has changed. */
	public readonly onDidChangeContent = this._onDidChangeDocument.event

	private readonly _onDidChange = new vscode.EventEmitter<{
		readonly label: string
		undo(): void
		redo(): void
	}>()

	public readonly onDidChange = this._onDidChange.event

	private readonly _onDidDispose = new vscode.EventEmitter<void>()
	/** Fired when the document is disposed of. */
	public readonly onDidDispose = this._onDidDispose.event

	private disposables: vscode.Disposable[] = [
		this._onDidChange,
		this._onDidChangeDocument,
		this._onDidDispose,
	]

	private constructor(
		public uri: vscode.Uri,
		public documentData: TldrawFile,
		backupId: string | undefined
	) {
		this.isBlankDocument = backupId === 'undefined'
	}

	static async create(uri: vscode.Uri, backupId: string | undefined) {
		let fileData: TldrawFile
		if (typeof backupId === 'string' && (await fileExists(vscode.Uri.parse(backupId)))) {
			fileData = await TLDrawDocument.readFile(vscode.Uri.parse(backupId))
		} else {
			fileData = await TLDrawDocument.readFile(uri)
		}
		return new TLDrawDocument(uri, fileData, backupId)
	}

	makeEdit(nextFile: TldrawFile) {
		nicelog('makeEdit')
		const prevData = this.documentData
		this.documentData = nextFile
		this._onDidChange.fire({
			label: 'edit',
			undo: async () => {
				nicelog('undo')
				this.documentData = prevData
				this._onDidChangeDocument.fire({
					reason: 'undo',
				})
			},
			redo: async () => {
				nicelog('redo')
				this.documentData = nextFile
				this._onDidChangeDocument.fire({
					reason: 'redo',
				})
			},
		})
	}
	dispose(): void {
		this.disposables.forEach((d) => d.dispose())
		this._onDidDispose.fire()
	}

	private static async readFile(uri: vscode.Uri): Promise<TldrawFile> {
		nicelog('readFile')

		if (uri.scheme === 'untitled') {
			return defaultFileContents
		}
		const fileContents = await vscode.workspace.fs.readFile(uri)
		return loadFile(Buffer.from(fileContents).toString('utf8'))
	}

	async loadBlankDocument() {
		this.documentData = defaultFileContents
		await this.writeToResource(this.uri)
		if (this.lastBackupDestination && (await fileExists(this.lastBackupDestination))) {
			await vscode.workspace.fs.delete(this.lastBackupDestination)
		}
	}

	/** Called by VS Code when the user saves the document. */
	async save(cancellation: vscode.CancellationToken): Promise<void> {
		nicelog('save')
		await this.saveAs(this.uri, cancellation)
	}

	/** Called by VS Code when the user saves the document to a new location. */
	async saveAs(targetResource: vscode.Uri, cancellation: vscode.CancellationToken): Promise<void> {
		nicelog('saveAs')
		if (cancellation.isCancellationRequested) {
			return
		}
		await this.writeToResource(targetResource)
	}

	private async writeToResource(targetResource: vscode.Uri) {
		const fileContents = Buffer.from(JSON.stringify(this.documentData, null, 2), 'utf8')
		await vscode.workspace.fs.writeFile(targetResource, fileContents)
	}

	/** Called by VS Code when the user calls `revert` on a document. */
	async revert(_cancellation: vscode.CancellationToken): Promise<void> {
		nicelog('revert')

		const diskContent = await TLDrawDocument.readFile(this.uri)
		this.documentData = diskContent
		this._onDidChangeDocument.fire({
			reason: 'revert',
			fileContents: diskContent,
		})
	}

	/**
	 * Called by VS Code to backup the edited document.
	 *
	 * These backups are used to implement hot exit.
	 */
	async backup(
		destination: vscode.Uri,
		cancellation: vscode.CancellationToken
	): Promise<vscode.CustomDocumentBackup> {
		nicelog('backup')
		this.lastBackupDestination = destination

		await this.saveAs(destination, cancellation)

		return {
			id: destination.toString(),
			delete: async () => {
				try {
					await vscode.workspace.fs.delete(destination)
				} catch {
					// noop
				}
			},
		}
	}

	async v1Backup(backupSaved: string, backupFailed: string) {
		const regex = /\.tldr$/gi
		if (!regex.test(this.uri.path)) {
			vscode.window.showInformationMessage(backupFailed)
			return
		}

		let destination = this.uri.with({ path: this.uri.path.replace(/\.tldr$/gi, ' - old.tldr') })
		let exists = await fileExists(destination)
		let fileNumber = 1
		while (exists) {
			destination = this.uri.with({
				path: this.uri.path.replace(/\.tldr$/gi, ` - old (${fileNumber}).tldr`),
			})
			exists = await fileExists(destination)
			fileNumber++
		}
		await vscode.workspace.fs.copy(this.uri, destination, { overwrite: false })
		const fileName = destination.path.split('/').pop()
		vscode.window.showInformationMessage(`${backupSaved}: ${fileName}`)
	}
}
