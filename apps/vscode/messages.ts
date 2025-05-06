type BookmarkRequest = {
	type: 'vscode:bookmark/request'
	uuid: string
	data: {
		url: string
	}
}
type BookmarkResponse = {
	type: 'vscode:bookmark/response'
	uuid: string
	data: {
		url: string
		title?: string
		description?: string
		image?: string
		favicon?: string
	}
}

type BookmarkError = {
	type: 'vscode:bookmark/error'
	uuid: string
	data: {
		error: string
	}
}

type GetFileRequest = {
	type: 'vscode:get-file/request'
	uuid: string
	data: {
		url: string
	}
}

type GetFileResponse = {
	type: 'vscode:get-file/response'
	uuid: string
	data: {
		fileName: string
		file: number[]
		mimeType: string
	}
}

type GetFileError = {
	type: 'vscode:get-file/error'
	uuid: string
	data: {
		error: string
	}
}

/** @public */
export type VscodeMessagePairs = {
	'vscode:bookmark': { request: BookmarkRequest; response: BookmarkResponse; error: BookmarkError }
	'vscode:get-file': { request: GetFileRequest; response: GetFileResponse; error: GetFileError }
}

/** @public */
export type VscodeMessage =
	| {
			type: 'vscode:editor-loaded'
	  }
	| {
			type: 'vscode:ready-to-receive-file'
	  }
	| {
			type: 'vscode:v1-file-opened'
			data: {
				description: string
				backup: string
				backupSaved: string
				backupFailed: string
				dontAskAgain: string
				open: string
			}
	  }
	| {
			type: 'vscode:undo'
	  }
	| {
			type: 'vscode:redo'
	  }
	| {
			type: 'vscode:cancel-v1-migrate'
	  }
	| {
			type: 'vscode:editor-updated' | 'vscode:revert'
			data: {
				fileContents: string
			}
	  }
	| {
			type: 'vscode:open-window'
			data: {
				url: string
				target: string
			}
	  }
	| {
			type: 'vscode:opened-file'
			data: {
				assetSrc: string
				fileContents: string
				showV1FileOpenWarning: boolean
				uri: string
				userId: string
				isDarkMode: boolean
			}
	  }
	| {
			type: 'vscode:hide-v1-file-open-warning'
	  }
	| { type: 'vscode:refresh-page' }
	| { type: 'vscode:hard-reset' }
	| BookmarkRequest
	| BookmarkResponse
	| GetFileRequest
	| GetFileResponse
