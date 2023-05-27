import { createTldrawEditorSchema } from '@tldraw/editor'
import { TldrawFile } from '@tldraw/file-format'
import * as vscode from 'vscode'

export const defaultFileContents: TldrawFile = {
	tldrawFileFormatVersion: 1,
	schema: createTldrawEditorSchema().serialize(),
	records: [],
}

export const fileContentWithErrors: TldrawFile = {
	tldrawFileFormatVersion: 1,
	schema: createTldrawEditorSchema().serialize(),
	records: [{ typeName: 'shape', id: null } as any],
}

export function loadFile(fileContents: string): TldrawFile {
	if (!fileContents) return defaultFileContents
	try {
		return JSON.parse(fileContents) as TldrawFile
	} catch (e) {
		return fileContentWithErrors
	}
}

export async function fileExists(destination: vscode.Uri) {
	try {
		await vscode.workspace.fs.stat(destination)
		return true
	} catch (e: any) {
		if (e.code !== 'FileNotFound') {
			// eslint-disable-next-line no-console
			console.log(e)
		}
		return false
	}
}
