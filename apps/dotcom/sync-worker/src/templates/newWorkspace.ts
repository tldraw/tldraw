import { SerializedSchema, UnknownRecord } from '@tldraw/store'
import { RoomSnapshot } from '@tldraw/sync-core'

// The initial "welcome" document seeded into a newly created workspace. Its canvas introduces
// workspaces (inviting people, moving files in, shared visibility) in place of an onboarding
// modal; the file itself is an ordinary file that the user can rename, edit, or delete.
//
// To regenerate after redesigning the canvas: open a file in the app, build the content,
// then run this in the console and replace `schema` and `records` below with the result:
//
//   JSON.stringify({
//     schema: editor.store.schema.serialize(),
//     records: Object.values(editor.store.serialize('document')),
//   })
//
// Keep only document/page/shape (and asset/binding) records: drop any `user` records and
// reset any `textFirstEditedBy` props to null, since those carry the authoring user's
// identity. The serialized schema must be the one captured at export time so the records
// migrate correctly when loaded under newer schema versions.

const schema: SerializedSchema = {
	schemaVersion: 2,
	sequences: {
		'com.tldraw.store': 5,
		'com.tldraw.asset': 1,
		'com.tldraw.camera': 1,
		'com.tldraw.document': 2,
		'com.tldraw.instance': 26,
		'com.tldraw.instance_page_state': 5,
		'com.tldraw.page': 1,
		'com.tldraw.instance_presence': 6,
		'com.tldraw.pointer': 1,
		'com.tldraw.shape': 4,
		'com.tldraw.user': 1,
		'com.tldraw.asset.image': 6,
		'com.tldraw.asset.video': 5,
		'com.tldraw.asset.bookmark': 2,
		'com.tldraw.shape.group': 0,
		'com.tldraw.shape.text': 4,
		'com.tldraw.shape.bookmark': 2,
		'com.tldraw.shape.draw': 4,
		'com.tldraw.shape.geo': 11,
		'com.tldraw.shape.note': 12,
		'com.tldraw.shape.line': 5,
		'com.tldraw.shape.frame': 1,
		'com.tldraw.shape.arrow': 8,
		'com.tldraw.shape.highlight': 3,
		'com.tldraw.shape.embed': 4,
		'com.tldraw.shape.image': 5,
		'com.tldraw.shape.video': 4,
		'com.tldraw.binding.arrow': 1,
	},
}

const records = [
	{
		gridSize: 10,
		name: '',
		meta: {},
		id: 'document:document',
		typeName: 'document',
	},
	{
		meta: {},
		id: 'page:page',
		name: 'Page 1',
		index: 'a1',
		typeName: 'page',
	},
	{
		x: 100,
		y: 510,
		rotation: 0,
		isLocked: false,
		opacity: 1,
		meta: {},
		id: 'shape:welcome-invite-tip',
		type: 'text',
		props: {
			color: 'grey',
			size: 's',
			w: 220,
			font: 'draw',
			textAlign: 'start',
			autoSize: false,
			scale: 1,
			richText: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'Shared the link by accident? Revoke it in the same menu to get a new one.',
							},
						],
					},
				],
			},
		},
		parentId: 'page:page',
		index: 'a6UxfAhG',
		typeName: 'shape',
	},
	{
		x: 100,
		y: 280,
		rotation: 0,
		isLocked: false,
		opacity: 1,
		meta: {},
		id: 'shape:welcome-note-invite',
		type: 'note',
		props: {
			color: 'light-blue',
			richText: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'Invite your team',
								marks: [
									{
										type: 'bold',
									},
								],
							},
						],
					},
					{
						type: 'paragraph',
						content: [],
					},
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'Copy an invite link from the workspace menu in the sidebar. Anyone with the link can join.',
							},
						],
					},
				],
			},
			size: 's',
			font: 'draw',
			align: 'start',
			verticalAlign: 'middle',
			labelColor: 'black',
			growY: 26.375,
			fontSizeAdjustment: 1,
			url: '',
			scale: 1,
			textFirstEditedBy: null,
		},
		parentId: 'page:page',
		index: 'a31QcROV',
		typeName: 'shape',
	},
	{
		x: 360,
		y: 280,
		rotation: 0,
		isLocked: false,
		opacity: 1,
		meta: {},
		id: 'shape:welcome-note-move',
		type: 'note',
		props: {
			color: 'light-green',
			richText: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'Move files in',
								marks: [
									{
										type: 'bold',
									},
								],
							},
						],
					},
					{
						type: 'paragraph',
						content: [],
					},
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: "Drag files onto this workspace in the sidebar, or use a file's 'Move to' menu.",
							},
						],
					},
				],
			},
			size: 's',
			font: 'draw',
			align: 'start',
			verticalAlign: 'middle',
			labelColor: 'black',
			growY: 2.078125,
			fontSizeAdjustment: 1,
			url: '',
			scale: 1,
			textFirstEditedBy: null,
		},
		parentId: 'page:page',
		index: 'a4MlBMSV',
		typeName: 'shape',
	},
	{
		x: 620,
		y: 280,
		rotation: 0,
		isLocked: false,
		opacity: 1,
		meta: {},
		id: 'shape:welcome-note-yours',
		type: 'note',
		props: {
			color: 'yellow',
			richText: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'Everything here is shared',
								marks: [
									{
										type: 'bold',
									},
								],
							},
						],
					},
					{
						type: 'paragraph',
						content: [],
					},
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'Everyone in this workspace can see and edit its files.',
							},
						],
					},
				],
			},
			size: 's',
			font: 'draw',
			align: 'start',
			verticalAlign: 'middle',
			labelColor: 'black',
			growY: 2.078125,
			fontSizeAdjustment: 1,
			url: '',
			scale: 1,
			textFirstEditedBy: null,
		},
		parentId: 'page:page',
		index: 'a5PIc2SV',
		typeName: 'shape',
	},
	{
		x: 102,
		y: 170,
		rotation: 0,
		isLocked: false,
		opacity: 1,
		meta: {},
		id: 'shape:welcome-subtitle',
		type: 'text',
		props: {
			color: 'grey',
			size: 'm',
			w: 650.6875,
			font: 'draw',
			textAlign: 'start',
			autoSize: true,
			scale: 1,
			richText: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: "A workspace is a shared space for your team's files.",
							},
						],
					},
				],
			},
		},
		parentId: 'page:page',
		index: 'a2HkzwPG',
		typeName: 'shape',
	},
	{
		x: 100,
		y: 90,
		rotation: 0,
		isLocked: false,
		opacity: 1,
		meta: {},
		id: 'shape:welcome-title',
		type: 'text',
		props: {
			color: 'black',
			size: 'xl',
			w: 633.984375,
			font: 'draw',
			textAlign: 'start',
			autoSize: true,
			scale: 1,
			richText: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'Welcome to your workspace',
							},
						],
					},
				],
			},
		},
		parentId: 'page:page',
		index: 'a16z2bbl',
		typeName: 'shape',
	},
] as unknown as UnknownRecord[]

export const newWorkspaceTemplateSnapshot: RoomSnapshot = {
	documentClock: 0,
	tombstoneHistoryStartsAtClock: 0,
	schema,
	documents: records.map((state) => ({ state, lastChangedClock: 0 })),
}
