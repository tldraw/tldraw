export interface TldrawAppFile {
	id: string
	createdAt: number
	updatedAt: number
	name: string
	owner: string | 'temporary'
	thumbnail: string
	shared: boolean
	sharedLinkType: 'view' | 'edit'
	isEmpty: boolean
}

export interface TldrawAppFileEdit {
	id: string
	createdAt: number
	updatedAt: number
	userId: string
	fileId: string
	sessionStartedAt: number
	fileOpenedAt: number
}

export interface TldrawAppFileVisit {
	id: string
	createdAt: number
	updatedAt: number
	userId: string
	fileId: string
}

export interface TldrawAppSessionState {
	createdAt: number
	isSidebarOpen: boolean
	isSidebarOpenMobile: boolean
	auth?: {
		userId: string // null,
	}
	shareMenuActiveTab: 'share' | 'export'
	sidebarActiveTab: 'recent' | 'groups' | 'shared' | 'drafts' | 'starred'
	theme: 'light' | 'dark'
	flags: { [key: string]: boolean }
}

export interface TldrawAppUser {
	id: string
	createdAt: number
	updatedAt: number
	name: string
	email: string
	avatar: string
	color: string
	exportFormat: 'png' | 'svg'
	exportTheme: 'dark' | 'light' | 'auto'
	exportBackground: boolean
	exportPadding: boolean
	// Separate table for user presences?
	presence: {
		fileIds: string[]
	}
	flags: {
		placeholder_feature_flag: boolean
	}
}

export interface TldrawAppSchema {
	users: TldrawAppUser
	files: TldrawAppFile
	fileVisits: TldrawAppFileVisit
	fileEdits: TldrawAppFileEdit
	sessionStates: TldrawAppSessionState
}
