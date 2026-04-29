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
			name: 'Purple',
			index: 'a0',
			typeName: 'page',
		},
	},
	schema: {
		schemaVersion: 2,
		sequences: {
			'com.tldraw.store': 4,
			'com.tldraw.document': 2,
			'com.tldraw.page': 1,
		},
	},
} as TLStoreSnapshot
