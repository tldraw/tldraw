import { createRecordType } from '@tldraw/store'
import {
	getTestMigration,
	getTestShapePropsMigration,
	testSchema,
} from './__tests__/migrationTestUtils.test'
import { bookmarkAssetVersions } from './assets/TLBookmarkAsset'
import { imageAssetVersions } from './assets/TLImageAsset'
import { videoAssetVersions } from './assets/TLVideoAsset'
import { assetVersions } from './records/TLAsset'
import { cameraVersions } from './records/TLCamera'
import { documentVersions } from './records/TLDocument'
import { instanceVersions } from './records/TLInstance'
import { pageVersions } from './records/TLPage'
import { instancePageStateVersions } from './records/TLPageState'
import { pointerVersions } from './records/TLPointer'
import { instancePresenceVersions } from './records/TLPresence'
import { TLShape, rootShapeVersions } from './records/TLShape'
import { arrowShapeVersions } from './shapes/TLArrowShape'
import { bookmarkShapeVersions } from './shapes/TLBookmarkShape'
import { drawShapeVersions } from './shapes/TLDrawShape'
import { embedShapeVersions } from './shapes/TLEmbedShape'
import { geoShapeVersions } from './shapes/TLGeoShape'
import { imageShapeVersions } from './shapes/TLImageShape'
import { lineShapeVersions } from './shapes/TLLineShape'
import { noteShapeVersions } from './shapes/TLNoteShape'
import { textShapeVersions } from './shapes/TLTextShape'
import { videoShapeVersions } from './shapes/TLVideoShape'
import { storeVersions } from './store-migrations'

/* ---  PUT YOUR MIGRATIONS TESTS BELOW HERE --- */

describe('TLVideoAsset AddIsAnimated', () => {
	const oldAsset = {
		id: '1',
		type: 'video',
		props: {
			src: 'https://www.youtube.com/watch?v=1',
			name: 'video',
			width: 100,
			height: 100,
			mimeType: 'video/mp4',
		},
	}

	const newAsset = {
		id: '1',
		type: 'video',
		props: {
			src: 'https://www.youtube.com/watch?v=1',
			name: 'video',
			width: 100,
			height: 100,
			mimeType: 'video/mp4',
			isAnimated: false,
		},
	}

	const { up, down } = getTestMigration(videoAssetVersions.AddIsAnimated)

	test('up works as expected', () => {
		expect(up(oldAsset)).toEqual(newAsset)
	})
	test('down works as expected', () => {
		expect(down(newAsset)).toEqual(oldAsset)
	})
})

describe('TLImageAsset AddIsAnimated', () => {
	const oldAsset = {
		id: '1',
		type: 'image',
		props: {
			src: 'https://www.youtube.com/watch?v=1',
			name: 'image',
			width: 100,
			height: 100,
			mimeType: 'image/gif',
		},
	}

	const newAsset = {
		id: '1',
		type: 'image',
		props: {
			src: 'https://www.youtube.com/watch?v=1',
			name: 'image',
			width: 100,
			height: 100,
			mimeType: 'image/gif',
			isAnimated: false,
		},
	}

	const { up, down } = getTestMigration(imageAssetVersions.AddIsAnimated)

	test('up works as expected', () => {
		expect(up(oldAsset)).toEqual(newAsset)
	})
	test('down works as expected', () => {
		expect(down(newAsset)).toEqual(oldAsset)
	})
})

const ShapeRecord = createRecordType('shape', {
	validator: { validate: (record) => record as TLShape },
	scope: 'document',
})

describe('Store removing Icon and Code shapes', () => {
	const { up } = getTestMigration(storeVersions.RemoveCodeAndIconShapeTypes)
	test('up works as expected', () => {
		const snapshot = Object.fromEntries(
			[
				ShapeRecord.create({
					type: 'icon',
					parentId: 'page:any',
					index: 'a0',
					props: { name: 'a' },
				} as any),
				ShapeRecord.create({
					type: 'icon',
					parentId: 'page:any',
					index: 'a0',
					props: { name: 'b' },
				} as any),
				ShapeRecord.create({
					type: 'code',
					parentId: 'page:any',
					index: 'a0',
					props: { name: 'c' },
				} as any),
				ShapeRecord.create({
					type: 'code',
					parentId: 'page:any',
					index: 'a0',
					props: { name: 'd' },
				} as any),
				ShapeRecord.create({
					type: 'geo',
					parentId: 'page:any',
					index: 'a0',
					props: { geo: 'rectangle', w: 1, h: 1, growY: 1, text: '' },
				} as any),
			].map((shape) => [shape.id, shape])
		)
		const fixed = up(snapshot)
		expect(Object.entries(fixed)).toHaveLength(1)
	})
})

describe('Adding export background', () => {
	const { up } = getTestMigration(instanceVersions.AddTransparentExportBgs)
	test('up works as expected', () => {
		const before = {}
		const after = { exportBackground: true }
		expect(up(before)).toEqual(after)
	})
})

describe('Removing dialogs from instance', () => {
	const { up } = getTestMigration(instanceVersions.RemoveDialog)
	test('up works as expected', () => {
		const before = { dialog: null }
		const after = {}
		expect(up(before)).toEqual(after)
	})
})

describe('Adding url props', () => {
	for (const [name, { up }] of [
		['video shape', getTestShapePropsMigration('video', videoShapeVersions.AddUrlProp)],
		['note shape', getTestShapePropsMigration('note', noteShapeVersions.AddUrlProp)],
		['geo shape', getTestShapePropsMigration('geo', geoShapeVersions.AddUrlProp)],
		['image shape', getTestShapePropsMigration('image', imageShapeVersions.AddUrlProp)],
	] as const) {
		test(`${name}: up works as expected`, () => {
			expect(up({})).toEqual({ url: '' })
		})
	}
})

describe('Bookmark null asset id', () => {
	const { up } = getTestShapePropsMigration('bookmark', bookmarkShapeVersions.NullAssetId)
	test('up works as expected', () => {
		expect(up({})).toEqual({ assetId: null })
	})
})

describe('Renaming asset props', () => {
	for (const [name, { up, down }] of [
		['image shape', getTestMigration(imageAssetVersions.RenameWidthHeight)],
		['video shape', getTestMigration(videoAssetVersions.RenameWidthHeight)],
	] as const) {
		test(`${name}: up works as expected`, () => {
			const before = { props: { width: 100, height: 100 } }
			const after = { props: { w: 100, h: 100 } }
			expect(up(before)).toEqual(after)
		})

		test(`${name}: down works as expected`, () => {
			const before = { props: { w: 100, h: 100 } }
			const after = { props: { width: 100, height: 100 } }
			expect(down(before)).toEqual(after)
		})
	}
})

describe('Adding instance.isToolLocked', () => {
	const { up } = getTestMigration(instanceVersions.AddToolLockMode)
	test('up works as expected', () => {
		expect(up({})).toMatchObject({ isToolLocked: false })
		expect(up({ isToolLocked: true })).toMatchObject({ isToolLocked: false })
	})
})

describe('Cleaning up junk data in instance.propsForNextShape', () => {
	const { up } = getTestMigration(instanceVersions.RemoveExtraPropsForNextShape)
	test('up works as expected', () => {
		expect(up({ propsForNextShape: { color: 'red', unknown: 'gone' } })).toEqual({
			propsForNextShape: {
				color: 'red',
			},
		})
	})
})

describe('Generating original URL from embed URL in GenOriginalUrlInEmbed', () => {
	const { up } = getTestShapePropsMigration('embed', embedShapeVersions.GenOriginalUrlInEmbed)
	test('up works as expected', () => {
		expect(up({ url: 'https://codepen.io/Rplus/embed/PWZYRM' })).toEqual({
			url: 'https://codepen.io/Rplus/pen/PWZYRM',
			tmpOldUrl: 'https://codepen.io/Rplus/embed/PWZYRM',
		})
	})

	test('invalid up works as expected', () => {
		expect(up({ url: 'https://example.com' })).toEqual({
			url: '',
			tmpOldUrl: 'https://example.com',
		})
	})
})

describe('Adding isPen prop', () => {
	const { up } = getTestShapePropsMigration('draw', drawShapeVersions.AddInPen)

	test('up works as expected with a shape that is not a pen shape', () => {
		expect(
			up({
				segments: [
					{
						type: 'free',
						points: [
							{ x: 0, y: 0, z: 0.5 },
							{ x: 1, y: 1, z: 0.5 },
						],
					},
				],
			})
		).toEqual({
			isPen: false,
			segments: [
				{
					type: 'free',
					points: [
						{ x: 0, y: 0, z: 0.5 },
						{ x: 1, y: 1, z: 0.5 },
					],
				},
			],
		})
	})

	test('up works as expected when converting to pen', () => {
		expect(
			up({
				segments: [
					{
						type: 'free',
						points: [
							{ x: 0, y: 0, z: 0.2315 },
							{ x: 1, y: 1, z: 0.2421 },
						],
					},
				],
			})
		).toEqual({
			isPen: true,
			segments: [
				{
					type: 'free',
					points: [
						{ x: 0, y: 0, z: 0.2315 },
						{ x: 1, y: 1, z: 0.2421 },
					],
				},
			],
		})
	})
})

describe('Adding isLocked prop', () => {
	const { up, down } = getTestMigration(rootShapeVersions.AddIsLocked)

	test('up works as expected', () => {
		expect(up({})).toEqual({ isLocked: false })
	})

	test('down works as expected', () => {
		expect(down({ isLocked: false })).toEqual({})
	})
})

describe('Adding labelColor prop to geo / arrow shapes', () => {
	for (const [name, { up }] of [
		['arrow shape', getTestShapePropsMigration('arrow', arrowShapeVersions.AddLabelColor)],
		['geo shape', getTestShapePropsMigration('geo', geoShapeVersions.AddLabelColor)],
	] as const) {
		test(`${name}: up works as expected`, () => {
			expect(up({ color: 'red' })).toEqual({ color: 'red', labelColor: 'black' })
		})
	}
})

describe('Adding labelColor prop to propsForNextShape', () => {
	const { up } = getTestMigration(instanceVersions.AddLabelColor)
	test('up works as expected', () => {
		expect(up({ propsForNextShape: { color: 'red' } })).toEqual({
			propsForNextShape: { color: 'red', labelColor: 'black' },
		})
	})
})

describe('Adding croppingShapeId to instancePageState', () => {
	const { up } = getTestMigration(instancePageStateVersions.AddCroppingId)
	test('up works as expected', () => {
		expect(up({})).toEqual({
			croppingShapeId: null,
		})
	})
})

describe('Renaming properties in instancePageState', () => {
	const { up, down } = getTestMigration(instancePageStateVersions.RenameProperties)
	test('up works as expected', () => {
		expect(
			up({
				selectedShapeIds: [],
				hintingShapeIds: [],
				erasingShapeIds: [],
				hoveredShapeId: null,
				editingShapeId: null,
				croppingShapeId: null,
				focusedGroupId: null,
				meta: {
					name: 'hallo',
				},
			})
		).toEqual({
			selectedShapeIds: [],
			hintingShapeIds: [],
			erasingShapeIds: [],
			hoveredShapeId: null,
			editingShapeId: null,
			croppingShapeId: null,
			focusedGroupId: null,
			meta: {
				name: 'hallo',
			},
		})
	})

	test('down works as expected', () => {
		expect(
			down({
				selectedShapeIds: [],
				hintingShapeIds: [],
				erasingShapeIds: [],
				hoveredShapeId: null,
				editingShapeId: null,
				croppingShapeId: null,
				focusedGroupId: null,
				meta: {
					name: 'hallo',
				},
			})
		).toEqual({
			selectedShapeIds: [],
			hintingShapeIds: [],
			erasingShapeIds: [],
			hoveredShapeId: null,
			editingShapeId: null,
			croppingShapeId: null,
			focusedGroupId: null,
			meta: {
				name: 'hallo',
			},
		})
	})
})

describe('Renaming properties again in instancePageState', () => {
	const { up, down } = getTestMigration(instancePageStateVersions.RenamePropertiesAgain)
	test('up works as expected', () => {
		expect(
			up({
				selectedIds: [],
				hintingIds: [],
				erasingIds: [],
				hoveredId: null,
				editingId: null,
				croppingId: null,
				focusLayerId: null,
				meta: {
					name: 'hallo',
				},
			})
		).toEqual({
			selectedShapeIds: [],
			hintingShapeIds: [],
			erasingShapeIds: [],
			hoveredShapeId: null,
			editingShapeId: null,
			croppingShapeId: null,
			focusedGroupId: null,
			meta: {
				name: 'hallo',
			},
		})
	})

	test('down works as expected', () => {
		expect(
			down({
				selectedShapeIds: [],
				hintingShapeIds: [],
				erasingShapeIds: [],
				hoveredShapeId: null,
				editingShapeId: null,
				croppingShapeId: null,
				focusedGroupId: null,
				meta: {
					name: 'hallo',
				},
			})
		).toEqual({
			selectedIds: [],
			hintingIds: [],
			erasingIds: [],
			hoveredId: null,
			editingId: null,
			croppingId: null,
			focusLayerId: null,
			meta: {
				name: 'hallo',
			},
		})
	})
})

describe('Adding followingUserId prop to instance', () => {
	const { up } = getTestMigration(instanceVersions.AddFollowingUserId)
	test('up works as expected', () => {
		expect(up({})).toEqual({ followingUserId: null })
	})
})

describe('Removing align=justify from propsForNextShape', () => {
	const { up } = getTestMigration(instanceVersions.RemoveAlignJustify)
	test('up works as expected', () => {
		expect(up({ propsForNextShape: { color: 'black', align: 'justify' } })).toEqual({
			propsForNextShape: { color: 'black', align: 'start' },
		})
		expect(up({ propsForNextShape: { color: 'black', align: 'end' } })).toEqual({
			propsForNextShape: { color: 'black', align: 'end' },
		})
	})
})

describe('Adding zoomBrush prop to instance', () => {
	const { up } = getTestMigration(instanceVersions.AddZoom)
	test('up works as expected', () => {
		expect(up({})).toEqual({ zoomBrush: null })
	})
})

describe('Removing align=justify from shape align props', () => {
	for (const [name, { up }] of [
		['text', getTestShapePropsMigration('text', textShapeVersions.RemoveJustify)],
		['note', getTestShapePropsMigration('note', noteShapeVersions.RemoveJustify)],
		['geo', getTestShapePropsMigration('geo', geoShapeVersions.RemoveJustify)],
	] as const) {
		test(`${name}: up works as expected`, () => {
			expect(up({ align: 'justify' })).toEqual({ align: 'start' })
			expect(up({ align: 'end' })).toEqual({ align: 'end' })
		})
	}
})

describe('Add crop=null to image shapes', () => {
	const { up, down } = getTestShapePropsMigration('image', imageShapeVersions.AddCropProp)
	test('up works as expected', () => {
		expect(up({ w: 100 })).toEqual({ w: 100, crop: null })
	})

	test('down works as expected', () => {
		expect(down({ w: 100, crop: null })).toEqual({ w: 100 })
	})
})

describe('Adding instance_presence to the schema', () => {
	const { up } = getTestMigration(storeVersions.AddInstancePresenceType)

	test('up works as expected', () => {
		expect(up({})).toEqual({})
	})
})

describe('Adding name to document', () => {
	const { up, down } = getTestMigration(documentVersions.AddName)

	test('up works as expected', () => {
		expect(up({})).toEqual({ name: '' })
	})

	test('down works as expected', () => {
		expect(down({ name: '' })).toEqual({})
	})
})

describe('Adding check-box to geo shape', () => {
	const { up } = getTestShapePropsMigration('geo', geoShapeVersions.AddCheckBox)

	test('up works as expected', () => {
		expect(up({ geo: 'rectangle' })).toEqual({ geo: 'rectangle' })
	})
})

describe('Add verticalAlign to geo shape', () => {
	const { up } = getTestShapePropsMigration('geo', geoShapeVersions.AddVerticalAlign)

	test('up works as expected', () => {
		expect(up({ type: 'ellipse' })).toEqual({ type: 'ellipse', verticalAlign: 'middle' })
	})
})

describe('Add verticalAlign to props for next shape', () => {
	const { up } = getTestMigration(instanceVersions.AddVerticalAlign)
	test('up works as expected', () => {
		expect(up({ propsForNextShape: { color: 'red' } })).toEqual({
			propsForNextShape: {
				color: 'red',
				verticalAlign: 'middle',
			},
		})
	})
})

describe('Migrate GeoShape legacy horizontal alignment', () => {
	const { up } = getTestShapePropsMigration('geo', geoShapeVersions.MigrateLegacyAlign)

	test('up works as expected', () => {
		expect(up({ align: 'start', type: 'ellipse' })).toEqual({
			align: 'start-legacy',
			type: 'ellipse',
		})
		expect(up({ align: 'middle', type: 'ellipse' })).toEqual({
			align: 'middle-legacy',
			type: 'ellipse',
		})
		expect(up({ align: 'end', type: 'ellipse' })).toEqual({ align: 'end-legacy', type: 'ellipse' })
	})
})

describe('adding cloud shape', () => {
	const { up } = getTestShapePropsMigration('geo', geoShapeVersions.AddCloud)

	test('up does nothing', () => {
		expect(up({ geo: 'rectangle' })).toEqual({ geo: 'rectangle' })
	})
})

describe('Migrate NoteShape legacy horizontal alignment', () => {
	const { up } = getTestShapePropsMigration('note', noteShapeVersions.MigrateLegacyAlign)

	test('up works as expected', () => {
		expect(up({ align: 'start', color: 'red' })).toEqual({ align: 'start-legacy', color: 'red' })
		expect(up({ align: 'middle', color: 'red' })).toEqual({ align: 'middle-legacy', color: 'red' })
		expect(up({ align: 'end', color: 'red' })).toEqual({ align: 'end-legacy', color: 'red' })
	})
})

describe('Adds delay to scribble', () => {
	const { up } = getTestMigration(instanceVersions.AddScribbleDelay)

	test('up has no effect when scribble is null', () => {
		expect(
			up({
				scribble: null,
			})
		).toEqual({ scribble: null })
	})

	test('up adds the delay property', () => {
		expect(
			up({
				scribble: {
					points: [{ x: 0, y: 0 }],
					size: 4,
					color: 'black',
					opacity: 1,
					state: 'starting',
				},
			})
		).toEqual({
			scribble: {
				points: [{ x: 0, y: 0 }],
				size: 4,
				color: 'black',
				opacity: 1,
				state: 'starting',
				delay: 0,
			},
		})
	})
})

describe('Adds delay to scribble', () => {
	const { up } = getTestMigration(instancePresenceVersions.AddScribbleDelay)

	test('up has no effect when scribble is null', () => {
		expect(
			up({
				scribble: null,
			})
		).toEqual({ scribble: null })
	})

	test('up adds the delay property', () => {
		expect(
			up({
				scribble: {
					points: [{ x: 0, y: 0 }],
					size: 4,
					color: 'black',
					opacity: 1,
					state: 'starting',
				},
			})
		).toEqual({
			scribble: {
				points: [{ x: 0, y: 0 }],
				size: 4,
				color: 'black',
				opacity: 1,
				state: 'starting',
				delay: 0,
			},
		})
	})
})

describe('user config refactor', () => {
	test('removes user and user_presence types from snapshots', () => {
		const { up } = getTestMigration(storeVersions.RemoveTLUserAndPresenceAndAddPointer)

		const prevSnapshot = {
			'user:123': {
				id: 'user:123',
				typeName: 'user',
			},
			'user_presence:123': {
				id: 'user_presence:123',
				typeName: 'user_presence',
			},
			'instance:123': {
				id: 'instance:123',
				typeName: 'instance',
			},
		}

		const nextSnapshot = {
			'instance:123': {
				id: 'instance:123',
				typeName: 'instance',
			},
		}

		// up removes the user and user_presence types
		expect(up(prevSnapshot)).toEqual(nextSnapshot)
	})

	test('removes userId from the instance state', () => {
		const { up } = getTestMigration(instanceVersions.RemoveUserId)

		const prev = {
			id: 'instance:123',
			typeName: 'instance',
			userId: 'user:123',
		}

		const next = {
			id: 'instance:123',
			typeName: 'instance',
		}

		expect(up(prev)).toEqual(next)
	})
})

describe('making instance state independent', () => {
	it('adds isPenMode and isGridMode to instance state', () => {
		const { up } = getTestMigration(instanceVersions.AddIsPenModeAndIsGridMode)

		const prev = {
			id: 'instance:123',
			typeName: 'instance',
		}
		const next = {
			id: 'instance:123',
			typeName: 'instance',
			isPenMode: false,
			isGridMode: false,
		}

		expect(up(prev)).toEqual(next)
	})

	it('removes instanceId and cameraId from instancePageState', () => {
		const { up } = getTestMigration(instancePageStateVersions.RemoveInstanceIdAndCameraId)

		const prev = {
			id: 'instance_page_state:123',
			typeName: 'instance_page_state',
			instanceId: 'instance:123',
			cameraId: 'camera:123',
			selectedShapeIds: [],
		}

		const next = {
			id: 'instance_page_state:123',
			typeName: 'instance_page_state',
			selectedShapeIds: [],
		}

		expect(up(prev)).toEqual(next)
	})

	it('removes instanceId from instancePresence', () => {
		const { up } = getTestMigration(instancePresenceVersions.RemoveInstanceId)

		const prev = {
			id: 'instance_presence:123',
			typeName: 'instance_presence',
			instanceId: 'instance:123',
			selectedShapeIds: [],
		}

		const next = {
			id: 'instance_presence:123',
			typeName: 'instance_presence',
			selectedShapeIds: [],
		}

		expect(up(prev)).toEqual(next)
	})

	it('removes userDocument from the schema', () => {
		const { up } = getTestMigration(storeVersions.RemoveUserDocument)

		const prev = {
			'user_document:123': {
				id: 'user_document:123',
				typeName: 'user_document',
			},
			'instance:123': {
				id: 'instance:123',
				typeName: 'instance',
			},
		}

		const next = {
			'instance:123': {
				id: 'instance:123',
				typeName: 'instance',
			},
		}

		expect(up(prev)).toEqual(next)
	})
})

describe('Adds NoteShape vertical alignment', () => {
	const { up } = getTestShapePropsMigration('note', noteShapeVersions.AddVerticalAlign)

	test('up works as expected', () => {
		expect(up({ color: 'red' })).toEqual({ verticalAlign: 'middle', color: 'red' })
	})
})

describe('hoist opacity', () => {
	test('hoists opacity from props to the root of the shape', () => {
		const { up, down } = getTestMigration(rootShapeVersions.HoistOpacity)
		const before = {
			type: 'myShape',
			x: 0,
			y: 0,
			props: {
				color: 'red',
				opacity: '0.5',
			},
		}
		const after = {
			type: 'myShape',
			x: 0,
			y: 0,
			opacity: 0.5,
			props: {
				color: 'red',
			},
		}

		expect(up(before)).toEqual(after)
		expect(down(after)).toEqual(before)

		const afterWithNonMatchingOpacity = {
			type: 'myShape',
			x: 0,
			y: 0,
			opacity: 0.6,
			props: {
				color: 'red',
			},
		}

		expect(down(afterWithNonMatchingOpacity)).toEqual(before)
	})

	test('hoists opacity from propsForNextShape', () => {
		const { up } = getTestMigration(instanceVersions.HoistOpacity)
		const before = {
			isToolLocked: true,
			propsForNextShape: {
				color: 'black',
				opacity: '0.5',
			},
		}
		const after = {
			isToolLocked: true,
			opacityForNextShape: 0.5,
			propsForNextShape: {
				color: 'black',
			},
		}

		expect(up(before)).toEqual(after)
	})
})

describe('Adds highlightedUserIds to instance', () => {
	const { up } = getTestMigration(instanceVersions.AddHighlightedUserIds)

	test('up works as expected', () => {
		expect(up({})).toEqual({ highlightedUserIds: [] })
	})
})

describe('Adds chat message to presence', () => {
	const { up } = getTestMigration(instancePresenceVersions.AddChatMessage)

	test('up adds the chatMessage property', () => {
		expect(up({})).toEqual({ chatMessage: '' })
	})
})

describe('Adds chat properties to instance', () => {
	const { up } = getTestMigration(instanceVersions.AddChat)

	test('up adds the chatMessage property', () => {
		expect(up({})).toEqual({ chatMessage: '', isChatting: false })
	})
})

describe('Removes does resize from embed', () => {
	const { up } = getTestShapePropsMigration('embed', embedShapeVersions.RemoveDoesResize)
	test('up works as expected', () => {
		expect(up({ url: 'https://tldraw.com', doesResize: true })).toEqual({
			url: 'https://tldraw.com',
		})
	})
})

describe('Removes tmpOldUrl from embed', () => {
	const { up } = getTestShapePropsMigration('embed', embedShapeVersions.RemoveTmpOldUrl)
	test('up works as expected', () => {
		expect(up({ url: 'https://tldraw.com', tmpOldUrl: 'https://tldraw.com' })).toEqual({
			url: 'https://tldraw.com',
		})
	})
})

describe('Removes overridePermissions from embed', () => {
	const { up } = getTestShapePropsMigration('embed', embedShapeVersions.RemovePermissionOverrides)

	test('up works as expected', () => {
		expect(up({ url: 'https://tldraw.com', overridePermissions: { display: 'maybe' } })).toEqual({
			url: 'https://tldraw.com',
		})
	})
})

describe('propsForNextShape -> stylesForNextShape', () => {
	test('deletes propsForNextShape and adds stylesForNextShape without trying to bring across contents', () => {
		const { up } = getTestMigration(instanceVersions.ReplacePropsForNextShapeWithStylesForNextShape)
		const beforeUp = {
			isToolLocked: true,
			propsForNextShape: {
				color: 'red',
				size: 'm',
			},
		}
		const afterUp = {
			isToolLocked: true,
			stylesForNextShape: {},
		}

		expect(up(beforeUp)).toEqual(afterUp)
	})
})

describe('adds meta ', () => {
	const metaMigrations = [
		getTestMigration(assetVersions.AddMeta),
		getTestMigration(cameraVersions.AddMeta),
		getTestMigration(documentVersions.AddMeta),
		getTestMigration(instanceVersions.AddMeta),
		getTestMigration(instancePageStateVersions.AddMeta),
		getTestMigration(instancePresenceVersions.AddMeta),
		getTestMigration(pageVersions.AddMeta),
		getTestMigration(pointerVersions.AddMeta),
		getTestMigration(rootShapeVersions.AddMeta),
	]

	for (const { up, id } of metaMigrations) {
		test('up works as expected for ' + id, () => {
			expect(up({})).toEqual({ meta: {} })
		})
	}
})

describe('removes cursor color', () => {
	const { up } = getTestMigration(instanceVersions.RemoveCursorColor)

	test('up works as expected', () => {
		expect(
			up({
				cursor: {
					type: 'default',
					rotation: 0.1,
					color: 'black',
				},
			})
		).toEqual({
			cursor: {
				type: 'default',
				rotation: 0.1,
			},
		})
	})
})

describe('adds lonely properties', () => {
	const { up } = getTestMigration(instanceVersions.AddLonelyProperties)

	test('up works as expected', () => {
		expect(up({})).toEqual({
			canMoveCamera: true,
			isFocused: false,
			devicePixelRatio: 1,
			isCoarsePointer: false,
			openMenus: [],
			isChangingStyle: false,
			isReadOnly: false,
		})
	})
})

describe('rename isReadOnly to isReadonly', () => {
	const { up } = getTestMigration(instanceVersions.ReadOnlyReadonly)

	test('up works as expected', () => {
		expect(up({ isReadOnly: false })).toEqual({
			isReadonly: false,
		})
	})
})

describe('Renames selectedShapeIds in presence', () => {
	const { up } = getTestMigration(instancePresenceVersions.RenameSelectedShapeIds)

	test('up adds the chatMessage property', () => {
		expect(up({ selectedShapeIds: [] })).toEqual({ selectedShapeIds: [] })
	})
})

describe('Adding canSnap to line handles', () => {
	const { up } = getTestShapePropsMigration('line', lineShapeVersions.AddSnapHandles)

	test(`up works as expected`, () => {
		expect(
			up({
				handles: {
					start: {
						id: 'start',
						type: 'vertex',
						canBind: false,
						index: 'a1',
						x: 0,
						y: 0,
					},
					end: {
						id: 'end',
						type: 'vertex',
						canBind: false,
						index: 'a2',
						x: 100.66015625,
						y: -22.07421875,
					},
				},
			})
		).toEqual({
			handles: {
				start: {
					id: 'start',
					type: 'vertex',
					canBind: false,
					canSnap: true,
					index: 'a1',
					x: 0,
					y: 0,
				},
				end: {
					id: 'end',
					type: 'vertex',
					canBind: false,
					canSnap: true,
					index: 'a2',
					x: 100.66015625,
					y: -22.07421875,
				},
			},
		})
	})
})

describe('add isHoveringCanvas to TLInstance', () => {
	const { up } = getTestMigration(instanceVersions.AddHoveringCanvas)

	test('up works as expected', () => {
		expect(up({})).toEqual({ isHoveringCanvas: null })
	})
})

describe('add isInset to TLInstance', () => {
	const { up, down } = getTestMigration(instanceVersions.AddInset)

	test('up works as expected', () => {
		expect(up({})).toEqual({ insets: [false, false, false, false] })
	})

	test('down works as expected', () => {
		expect(down({ insets: [false, false, false, false] })).toEqual({})
	})
})

describe('add scribbles to TLInstance', () => {
	const { up } = getTestMigration(instanceVersions.AddScribbles)

	test('up works as expected', () => {
		expect(
			up({
				scribble: null,
			})
		).toEqual({ scribbles: [] })
	})
})

describe('add isPrecise to arrow handles', () => {
	const { up, down } = getTestShapePropsMigration('arrow', arrowShapeVersions.AddIsPrecise)

	test('up works as expected', () => {
		expect(
			up({
				start: {
					type: 'point',
				},
				end: {
					type: 'binding',
					normalizedAnchor: { x: 0.5, y: 0.5 },
				},
			})
		).toEqual({
			start: {
				type: 'point',
			},
			end: {
				type: 'binding',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isPrecise: false,
			},
		})
		expect(
			up({
				start: {
					type: 'point',
				},
				end: {
					type: 'binding',
					normalizedAnchor: { x: 0.15, y: 0.15 },
				},
			})
		).toEqual({
			start: {
				type: 'point',
			},
			end: {
				type: 'binding',
				normalizedAnchor: { x: 0.15, y: 0.15 },
				isPrecise: true,
			},
		})
	})

	test('down works as expected', () => {
		expect(
			down({
				start: {
					type: 'point',
				},
				end: {
					type: 'binding',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isPrecise: true,
				},
			})
		).toEqual({
			start: {
				type: 'point',
			},
			end: {
				type: 'binding',
				normalizedAnchor: { x: 0.5, y: 0.5 },
			},
		})

		expect(
			down({
				start: {
					type: 'point',
				},
				end: {
					type: 'binding',
					normalizedAnchor: { x: 0.25, y: 0.25 },
					isPrecise: true,
				},
			})
		).toEqual({
			start: {
				type: 'point',
			},
			end: {
				type: 'binding',
				normalizedAnchor: { x: 0.25, y: 0.25 },
			},
		})

		expect(
			down({
				start: {
					type: 'binding',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isPrecise: false,
				},
				end: {
					type: 'binding',
					normalizedAnchor: { x: 0.15, y: 0.15 },
					isPrecise: false,
				},
			})
		).toEqual({
			start: {
				type: 'binding',
				normalizedAnchor: { x: 0.5, y: 0.5 },
			},
			end: {
				type: 'binding',
				normalizedAnchor: { x: 0.5, y: 0.5 },
			},
		})
	})
})

describe('add AddLabelPosition to arrow handles', () => {
	const { up, down } = getTestShapePropsMigration('arrow', arrowShapeVersions.AddLabelPosition)

	test('up works as expected', () => {
		expect(up({})).toEqual({ labelPosition: 0.5 })
	})

	test('down works as expected', () => {
		expect(
			down({
				labelPosition: 0.5,
			})
		).toEqual({})
	})
})

const invalidUrl = 'invalid-url'
const validUrl = ''

describe('Make urls valid for all the shapes', () => {
	const migrations = [
		['bookmark shape', getTestShapePropsMigration('bookmark', bookmarkShapeVersions.MakeUrlsValid)],
		['geo shape', getTestShapePropsMigration('geo', geoShapeVersions.MakeUrlsValid)],
		['image shape', getTestShapePropsMigration('image', imageShapeVersions.MakeUrlsValid)],
		['note shape', getTestShapePropsMigration('note', noteShapeVersions.MakeUrlsValid)],
		['video shape', getTestShapePropsMigration('video', videoShapeVersions.MakeUrlsValid)],
	] as const

	for (const [shapeName, { up, down }] of migrations) {
		it(`works for ${shapeName}`, () => {
			const shape = { url: invalidUrl }
			expect(up(shape)).toEqual({ url: validUrl })
			expect(down(shape)).toEqual(shape)
		})
	}
})

describe('Make urls valid for all the assets', () => {
	const migrations = [
		['bookmark asset', getTestMigration(bookmarkAssetVersions.MakeUrlsValid)],
		['image asset', getTestMigration(imageAssetVersions.MakeUrlsValid)],
		['video asset', getTestMigration(videoAssetVersions.MakeUrlsValid)],
	] as const

	for (const [assetName, { up, down }] of migrations) {
		it(`works for ${assetName}`, () => {
			const asset = { props: { src: invalidUrl } }
			expect(up(asset)).toEqual({ props: { src: validUrl } })
			expect(down(asset)).toEqual(asset)
		})
	}
})

describe('Add duplicate props to instance', () => {
	const { up, down } = getTestMigration(instanceVersions.AddDuplicateProps)
	it('up works as expected', () => {
		expect(up({})).toEqual({ duplicateProps: null })
	})
	it('down works as expected', () => {
		expect(down({ duplicateProps: null })).toEqual({})
	})
})

describe('Remove extra handle props', () => {
	const { up, down } = getTestShapePropsMigration('line', lineShapeVersions.RemoveExtraHandleProps)
	it('up works as expected', () => {
		expect(
			up({
				handles: {
					start: {
						id: 'start',
						type: 'vertex',
						canBind: false,
						canSnap: true,
						index: 'a1',
						x: 0,
						y: 0,
					},
					end: {
						id: 'end',
						type: 'vertex',
						canBind: false,
						canSnap: true,
						index: 'a2',
						x: 190,
						y: -62,
					},
					'handle:a1V': {
						id: 'handle:a1V',
						type: 'vertex',
						canBind: false,
						index: 'a1V',
						x: 76,
						y: 60,
					},
				},
			})
		).toEqual({
			handles: {
				a1: { x: 0, y: 0 },
				a1V: { x: 76, y: 60 },
				a2: { x: 190, y: -62 },
			},
		})
	})
	it('down works as expected', () => {
		expect(
			down({
				handles: {
					a1: { x: 0, y: 0 },
					a1V: { x: 76, y: 60 },
					a2: { x: 190, y: -62 },
				},
			})
		).toEqual({
			handles: {
				start: {
					id: 'start',
					type: 'vertex',
					canBind: false,
					canSnap: true,
					index: 'a1',
					x: 0,
					y: 0,
				},
				end: {
					id: 'end',
					type: 'vertex',
					canBind: false,
					canSnap: true,
					index: 'a2',
					x: 190,
					y: -62,
				},
				'handle:a1V': {
					id: 'handle:a1V',
					type: 'vertex',
					canBind: false,
					canSnap: true,
					index: 'a1V',
					x: 76,
					y: 60,
				},
			},
		})
	})
})

describe('Restore some handle props', () => {
	const { up, down } = getTestShapePropsMigration('line', lineShapeVersions.HandlesToPoints)
	it('up works as expected', () => {
		expect(
			up({
				handles: {
					a1: { x: 0, y: 0 },
					a1V: { x: 76, y: 60 },
					a2: { x: 190, y: -62 },
				},
			})
		).toEqual({
			points: [
				{ x: 0, y: 0 },
				{ x: 76, y: 60 },
				{ x: 190, y: -62 },
			],
		})
	})
	it('down works as expected', () => {
		expect(
			down({
				points: [
					{ x: 0, y: 0 },
					{ x: 76, y: 60 },
					{ x: 190, y: -62 },
				],
			})
		).toEqual({
			handles: {
				a1: { x: 0, y: 0 },
				a2: { x: 76, y: 60 },
				a3: { x: 190, y: -62 },
			},
		})
	})
})

describe('Fractional indexing for line points', () => {
	const { up, down } = getTestShapePropsMigration('line', lineShapeVersions.PointIndexIds)
	it('up works as expected', () => {
		expect(
			up({
				points: [
					{ x: 0, y: 0 },
					{ x: 76, y: 60 },
					{ x: 190, y: -62 },
				],
			})
		).toEqual({
			points: {
				a1: { id: 'a1', index: 'a1', x: 0, y: 0 },
				a2: { id: 'a2', index: 'a2', x: 76, y: 60 },
				a3: { id: 'a3', index: 'a3', x: 190, y: -62 },
			},
		})
	})
	it('down works as expected', () => {
		expect(
			down({
				points: {
					a1: { id: 'a1', index: 'a1', x: 0, y: 0 },
					a3: { id: 'a3', index: 'a3', x: 190, y: -62 },
					a2: { id: 'a2', index: 'a2', x: 76, y: 60 },
				},
			})
		).toEqual({
			points: [
				{ x: 0, y: 0 },
				{ x: 76, y: 60 },
				{ x: 190, y: -62 },
			],
		})
	})
})

describe('add white', () => {
	const { up, down } = rootShapeMigrations.migrators[rootShapeVersions.AddWhite]

	test('up works as expected', () => {
		expect(
			up({
				props: {},
			})
		).toEqual({
			props: {},
		})
	})

	test('down works as expected', () => {
		expect(
			down({
				props: {
					color: 'white',
				},
			})
		).toEqual({
			props: {
				color: 'black',
			},
		})
	})
})

/* ---  PUT YOUR MIGRATIONS TESTS ABOVE HERE --- */

// check that all migrator fns were called at least once
describe('all migrator fns were called at least once', () => {
	for (const migration of testSchema.sortedMigrations) {
		it(`migration ${migration.id}`, () => {
			expect((migration as any).up).toHaveBeenCalled()
			if (typeof migration.down === 'function') {
				expect((migration as any).down).toHaveBeenCalled()
			}
		})
	}
})
