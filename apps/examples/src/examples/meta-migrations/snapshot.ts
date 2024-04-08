import { TLStoreSnapshot } from 'tldraw'

export const snapshot = {
	store: {
		'document:document': {
			gridSize: 10,
			name: '',
			meta: {},
			id: 'document:document',
			typeName: 'document',
		},
		'page:red': {
			meta: {
				backgroundTheme: 'red',
			},
			id: 'page:red',
			name: 'Red',
			index: 'a1',
			typeName: 'page',
		},
		'page:green': {
			meta: {
				backgroundTheme: 'green',
			},
			id: 'page:green',
			name: 'Green',
			index: 'a2',
			typeName: 'page',
		},
		'page:blue': {
			meta: {
				backgroundTheme: 'blue',
			},
			id: 'page:blue',
			name: 'Blue',
			index: 'a3',
			typeName: 'page',
		},
		'page:purple': {
			meta: {
				backgroundTheme: 'purple',
			},
			id: 'page:purple',
			name: 'Purple (but now blue)',
			index: 'a0',
			typeName: 'page',
		},
	},
	schema: {
		schemaVersion: 2,
		sequences: {
			'com.tldraw.store': {
				version: 4,
				retroactive: false,
			},
			'com.tldraw.document': {
				version: 2,
				retroactive: true,
			},
			'com.tldraw.page': {
				version: 1,
				retroactive: true,
			},
		},
	},
} as TLStoreSnapshot
