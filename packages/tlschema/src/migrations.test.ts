import { createRecordType } from '@tldraw/store'
import { getTestMigration, testSchema } from './__tests__/migrationTestUtils'
import { bookmarkAssetVersions } from './assets/TLBookmarkAsset'
import { imageAssetVersions } from './assets/TLImageAsset'
import { videoAssetVersions } from './assets/TLVideoAsset'
import { arrowBindingVersions } from './bindings/TLArrowBinding'
import { toRichText } from './misc/TLRichText'
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
import { frameShapeVersions } from './shapes/TLFrameShape'
import { geoShapeVersions } from './shapes/TLGeoShape'
import { highlightShapeVersions } from './shapes/TLHighlightShape'
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

describe('TLVideoAsset AddFileSize', () => {
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
			fileSize: -1,
		},
	}

	const { up, down } = getTestMigration(videoAssetVersions.AddFileSize)

	test('up works as expected', () => {
		expect(up(oldAsset)).toEqual(newAsset)
	})
	test('down works as expected', () => {
		expect(down(newAsset)).toEqual(oldAsset)
	})
})

describe('TLImageAsset AddFileSize', () => {
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
			fileSize: -1,
		},
	}

	const { up, down } = getTestMigration(imageAssetVersions.AddFileSize)

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
					props: {
						geo: 'rectangle',
						w: 1,
						h: 1,
						growY: 1,
						richText: toRichText(''),
					},
				} as any),
			].map((shape) => [shape.id, shape])
		)
		const fixed = up(snapshot)
		expect(Object.entries(fixed)).toHaveLength(1)
	})
})

describe('Fixing index keys', () => {
	const { up, down } = getTestMigration(storeVersions.FixIndexKeys)
	test('up works as expected', () => {
		const snapshot = [
			ShapeRecord.create({
				type: 'shape',
				id: 'shape:1',
				parentId: 'page:any',
				index: 'a0',
			} as any),
			ShapeRecord.create({
				type: 'shape',
				id: 'shape:2',
				parentId: 'page:any',
				index: 'a00',
			} as any),
			ShapeRecord.create({
				type: 'shape',
				id: 'shape:3',
				parentId: 'page:any',
				index: 'a111',
			} as any),
		]
		const fixed = snapshot.map((shape) => up(shape))
		expect(fixed.find((s) => s.id === 'shape:1')?.index).toBe('a0')
		expect(fixed.find((s) => s.id === 'shape:2')?.index).not.toBe('a00')
		expect(fixed.find((s) => s.id === 'shape:2')?.index).toMatch(/^a0[1-9A-Za-z]{3}$/)
		expect(fixed.find((s) => s.id === 'shape:3')?.index).toBe('a111')
	})

	test('down works as expected', () => {
		const snapshot = [
			ShapeRecord.create({
				type: 'shape',
				id: 'shape:1',
				parentId: 'page:any',
				index: 'a00',
			} as any),
		]
		const unchanged = snapshot.map((shape) => down(shape))
		expect(unchanged.find((s) => s.id === 'shape:1')?.index).toBe('a00')
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
		['video shape', getTestMigration(videoShapeVersions.AddUrlProp)],
		['note shape', getTestMigration(noteShapeVersions.AddUrlProp)],
		['geo shape', getTestMigration(geoShapeVersions.AddUrlProp)],
		['image shape', getTestMigration(imageShapeVersions.AddUrlProp)],
	] as const) {
		test(`${name}: up works as expected`, () => {
			expect(up({ props: {} })).toEqual({ props: { url: '' } })
		})
	}
})

describe('Bookmark null asset id', () => {
	const { up } = getTestMigration(bookmarkShapeVersions.NullAssetId)
	test('up works as expected', () => {
		expect(up({ props: {} })).toEqual({ props: { assetId: null } })
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
	const { up } = getTestMigration(embedShapeVersions.GenOriginalUrlInEmbed)
	test('up works as expected', () => {
		expect(up({ props: { url: 'https://codepen.io/Rplus/embed/PWZYRM' } })).toEqual({
			props: {
				url: 'https://codepen.io/Rplus/pen/PWZYRM',
				tmpOldUrl: 'https://codepen.io/Rplus/embed/PWZYRM',
			},
		})
	})

	test('invalid up works as expected', () => {
		expect(up({ props: { url: 'https://example.com' } })).toEqual({
			props: {
				url: '',
				tmpOldUrl: 'https://example.com',
			},
		})
	})
})

describe('Adding isPen prop', () => {
	const { up } = getTestMigration(drawShapeVersions.AddInPen)

	test('up works as expected with a shape that is not a pen shape', () => {
		expect(
			up({
				props: {
					segments: [
						{
							type: 'free',
							points: [
								{ x: 0, y: 0, z: 0.5 },
								{ x: 1, y: 1, z: 0.5 },
							],
						},
					],
				},
			})
		).toEqual({
			props: {
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
			},
		})
	})

	test('up works as expected when converting to pen', () => {
		expect(
			up({
				props: {
					segments: [
						{
							type: 'free',
							points: [
								{ x: 0, y: 0, z: 0.2315 },
								{ x: 1, y: 1, z: 0.2421 },
							],
						},
					],
				},
			})
		).toEqual({
			props: {
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
			},
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
		['arrow shape', getTestMigration(arrowShapeVersions.AddLabelColor)],
		['geo shape', getTestMigration(geoShapeVersions.AddLabelColor)],
	] as const) {
		test(`${name}: up works as expected`, () => {
			expect(up({ props: { color: 'red' } })).toEqual({
				props: { color: 'red', labelColor: 'black' },
			})
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
		['text', getTestMigration(textShapeVersions.RemoveJustify)],
		['note', getTestMigration(noteShapeVersions.RemoveJustify)],
		['geo', getTestMigration(geoShapeVersions.RemoveJustify)],
	] as const) {
		test(`${name}: up works as expected`, () => {
			expect(up({ props: { align: 'justify' } })).toEqual({ props: { align: 'start' } })
			expect(up({ props: { align: 'end' } })).toEqual({ props: { align: 'end' } })
		})
	}
})

describe('Add crop=null to image shapes', () => {
	const { up, down } = getTestMigration(imageShapeVersions.AddCropProp)
	test('up works as expected', () => {
		expect(up({ props: { w: 100 } })).toEqual({ props: { w: 100, crop: null } })
	})

	test('down works as expected', () => {
		expect(down({ props: { w: 100, crop: null } })).toEqual({ props: { w: 100 } })
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
	const { up } = getTestMigration(geoShapeVersions.AddCheckBox)

	test('up works as expected', () => {
		expect(up({ props: { geo: 'rectangle' } })).toEqual({ props: { geo: 'rectangle' } })
	})
})

describe('Add verticalAlign to geo shape', () => {
	const { up } = getTestMigration(geoShapeVersions.AddVerticalAlign)

	test('up works as expected', () => {
		expect(up({ props: { type: 'ellipse' } })).toEqual({
			props: { type: 'ellipse', verticalAlign: 'middle' },
		})
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
	const { up } = getTestMigration(geoShapeVersions.MigrateLegacyAlign)

	test('up works as expected', () => {
		expect(up({ props: { align: 'start', type: 'ellipse' } })).toEqual({
			props: {
				align: 'start-legacy',
				type: 'ellipse',
			},
		})
		expect(up({ props: { align: 'middle', type: 'ellipse' } })).toEqual({
			props: {
				align: 'middle-legacy',
				type: 'ellipse',
			},
		})
		expect(up({ props: { align: 'end', type: 'ellipse' } })).toEqual({
			props: { align: 'end-legacy', type: 'ellipse' },
		})
	})
})

describe('adding cloud shape', () => {
	const { up } = getTestMigration(geoShapeVersions.AddCloud)

	test('up does nothing', () => {
		expect(up({ props: { geo: 'rectangle' } })).toEqual({ props: { geo: 'rectangle' } })
	})
})

describe('Migrate NoteShape legacy horizontal alignment', () => {
	const { up } = getTestMigration(noteShapeVersions.MigrateLegacyAlign)

	test('up works as expected', () => {
		expect(up({ props: { align: 'start', color: 'red' } })).toEqual({
			props: { align: 'start-legacy', color: 'red' },
		})
		expect(up({ props: { align: 'middle', color: 'red' } })).toEqual({
			props: { align: 'middle-legacy', color: 'red' },
		})
		expect(up({ props: { align: 'end', color: 'red' } })).toEqual({
			props: { align: 'end-legacy', color: 'red' },
		})
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
	const { up } = getTestMigration(noteShapeVersions.AddVerticalAlign)

	test('up works as expected', () => {
		expect(up({ props: { color: 'red' } })).toEqual({
			props: { color: 'red', verticalAlign: 'middle' },
		})
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
	const { up } = getTestMigration(embedShapeVersions.RemoveDoesResize)
	test('up works as expected', () => {
		expect(up({ props: { url: 'https://tldraw.com', doesResize: true } })).toEqual({
			props: {
				url: 'https://tldraw.com',
			},
		})
	})
})

describe('Removes tmpOldUrl from embed', () => {
	const { up } = getTestMigration(embedShapeVersions.RemoveTmpOldUrl)
	test('up works as expected', () => {
		expect(up({ props: { url: 'https://tldraw.com', tmpOldUrl: 'https://tldraw.com' } })).toEqual({
			props: {
				url: 'https://tldraw.com',
			},
		})
	})
})

describe('Removes overridePermissions from embed', () => {
	const { up } = getTestMigration(embedShapeVersions.RemovePermissionOverrides)

	test('up works as expected', () => {
		expect(
			up({ props: { url: 'https://tldraw.com', overridePermissions: { display: 'maybe' } } })
		).toEqual({
			props: {
				url: 'https://tldraw.com',
			},
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
	const { up } = getTestMigration(lineShapeVersions.AddSnapHandles)

	test(`up works as expected`, () => {
		expect(
			up({
				props: {
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
				},
			})
		).toEqual({
			props: {
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
	const { up, down } = getTestMigration(arrowShapeVersions.AddIsPrecise)

	test('up works as expected', () => {
		expect(
			up({
				props: {
					start: {
						type: 'point',
					},
					end: {
						type: 'binding',
						normalizedAnchor: { x: 0.5, y: 0.5 },
					},
				},
			})
		).toEqual({
			props: {
				start: {
					type: 'point',
				},
				end: {
					type: 'binding',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isPrecise: false,
				},
			},
		})
		expect(
			up({
				props: {
					start: {
						type: 'point',
					},
					end: {
						type: 'binding',
						normalizedAnchor: { x: 0.15, y: 0.15 },
					},
				},
			})
		).toEqual({
			props: {
				start: {
					type: 'point',
				},
				end: {
					type: 'binding',
					normalizedAnchor: { x: 0.15, y: 0.15 },
					isPrecise: true,
				},
			},
		})
	})

	test('down works as expected', () => {
		expect(
			down({
				props: {
					start: {
						type: 'point',
					},
					end: {
						type: 'binding',
						normalizedAnchor: { x: 0.5, y: 0.5 },
						isPrecise: true,
					},
				},
			})
		).toEqual({
			props: {
				start: {
					type: 'point',
				},
				end: {
					type: 'binding',
					normalizedAnchor: { x: 0.5, y: 0.5 },
				},
			},
		})

		expect(
			down({
				props: {
					start: {
						type: 'point',
					},
					end: {
						type: 'binding',
						normalizedAnchor: { x: 0.25, y: 0.25 },
						isPrecise: true,
					},
				},
			})
		).toEqual({
			props: {
				start: {
					type: 'point',
				},
				end: {
					type: 'binding',
					normalizedAnchor: { x: 0.25, y: 0.25 },
				},
			},
		})

		expect(
			down({
				props: {
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
				},
			})
		).toEqual({
			props: {
				start: {
					type: 'binding',
					normalizedAnchor: { x: 0.5, y: 0.5 },
				},
				end: {
					type: 'binding',
					normalizedAnchor: { x: 0.5, y: 0.5 },
				},
			},
		})
	})
})

describe('add AddLabelPosition to arrow handles', () => {
	const { up, down } = getTestMigration(arrowShapeVersions.AddLabelPosition)

	test('up works as expected', () => {
		expect(up({ props: {} })).toEqual({ props: { labelPosition: 0.5 } })
	})

	test('down works as expected', () => {
		expect(
			down({
				props: {
					labelPosition: 0.5,
				},
			})
		).toEqual({ props: {} })
	})
})

const invalidUrl = 'invalid-url'
const validUrl = ''

describe('Make urls valid for all the shapes', () => {
	const migrations = [
		['bookmark shape', getTestMigration(bookmarkShapeVersions.MakeUrlsValid)],
		['geo shape', getTestMigration(geoShapeVersions.MakeUrlsValid)],
		['image shape', getTestMigration(imageShapeVersions.MakeUrlsValid)],
		['note shape', getTestMigration(noteShapeVersions.MakeUrlsValid)],
		['video shape', getTestMigration(videoShapeVersions.MakeUrlsValid)],
	] as const

	for (const [shapeName, { up, down }] of migrations) {
		it(`works for ${shapeName}`, () => {
			const shape = { props: { url: invalidUrl } }
			expect(up(shape)).toEqual({ props: { url: validUrl } })
			expect(down(shape)).toEqual(shape)
		})
	}
})

describe('Add rich text', () => {
	const migrations = [
		['text shape', getTestMigration(textShapeVersions.AddRichText)],
		['geo shape', getTestMigration(geoShapeVersions.AddRichText)],
		['note shape', getTestMigration(noteShapeVersions.AddRichText)],
		['arrow shape', getTestMigration(arrowShapeVersions.AddRichText)],
	] as const

	for (const [shapeName, { up }] of migrations) {
		it(`works for ${shapeName}`, () => {
			const shape = { props: { text: 'hello, world' } }
			expect(up(shape)).toEqual({
				props: { richText: toRichText('hello, world') },
			})
			// N.B. Explicitly no down state so that we force clients to update.
			// expect(down(originalShape)).toEqual(shape)
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

describe('Ensure favicons are on bookmarks', () => {
	const { up, down } = getTestMigration(bookmarkAssetVersions.AddFavicon)
	it('up works as expected', () => {
		expect(
			up({
				props: {},
			})
		).toEqual({
			props: {
				favicon: '',
			},
		})
	})
	it('down works as expected', () => {
		expect(
			down({
				props: {
					favicon: 'https://tldraw.com/favicon.ico',
				},
			})
		).toEqual({
			props: {},
		})
	})
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
	const { up, down } = getTestMigration(lineShapeVersions.RemoveExtraHandleProps)
	it('up works as expected', () => {
		expect(
			up({
				props: {
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
				},
			})
		).toEqual({
			props: {
				handles: {
					a1: { x: 0, y: 0 },
					a1V: { x: 76, y: 60 },
					a2: { x: 190, y: -62 },
				},
			},
		})
	})
	it('down works as expected', () => {
		expect(
			down({
				props: {
					handles: {
						a1: { x: 0, y: 0 },
						a1V: { x: 76, y: 60 },
						a2: { x: 190, y: -62 },
					},
				},
			})
		).toEqual({
			props: {
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
			},
		})
	})
})

describe('Restore some handle props', () => {
	const { up, down } = getTestMigration(lineShapeVersions.HandlesToPoints)
	it('up works as expected', () => {
		expect(
			up({
				props: {
					handles: {
						a1: { x: 0, y: 0 },
						a1V: { x: 76, y: 60 },
						a2: { x: 190, y: -62 },
					},
				},
			})
		).toEqual({
			props: {
				points: [
					{ x: 0, y: 0 },
					{ x: 76, y: 60 },
					{ x: 190, y: -62 },
				],
			},
		})
	})
	it('down works as expected', () => {
		expect(
			down({
				props: {
					points: [
						{ x: 0, y: 0 },
						{ x: 76, y: 60 },
						{ x: 190, y: -62 },
					],
				},
			})
		).toEqual({
			props: {
				handles: {
					a1: { x: 0, y: 0 },
					a2: { x: 76, y: 60 },
					a3: { x: 190, y: -62 },
				},
			},
		})
	})
})

describe('Fractional indexing for line points', () => {
	const { up, down } = getTestMigration(lineShapeVersions.PointIndexIds)
	it('up works as expected', () => {
		expect(
			up({
				props: {
					points: [
						{ x: 0, y: 0 },
						{ x: 76, y: 60 },
						{ x: 190, y: -62 },
					],
				},
			})
		).toEqual({
			props: {
				points: {
					a1: { id: 'a1', index: 'a1', x: 0, y: 0 },
					a2: { id: 'a2', index: 'a2', x: 76, y: 60 },
					a3: { id: 'a3', index: 'a3', x: 190, y: -62 },
				},
			},
		})
	})
	it('down works as expected', () => {
		expect(
			down({
				props: {
					points: {
						a1: { id: 'a1', index: 'a1', x: 0, y: 0 },
						a3: { id: 'a3', index: 'a3', x: 190, y: -62 },
						a2: { id: 'a2', index: 'a2', x: 76, y: 60 },
					},
				},
			})
		).toEqual({
			props: {
				points: [
					{ x: 0, y: 0 },
					{ x: 76, y: 60 },
					{ x: 190, y: -62 },
				],
			},
		})
	})
})

describe('add white', () => {
	const { up, down } = getTestMigration(rootShapeVersions.AddWhite)

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

describe('Add font size adjustment to notes', () => {
	const { up, down } = getTestMigration(noteShapeVersions.AddFontSizeAdjustment)

	test('up works as expected', () => {
		expect(up({ props: {} })).toEqual({ props: { fontSizeAdjustment: 0 } })
	})

	test('down works as expected', () => {
		expect(down({ props: { fontSizeAdjustment: 0 } })).toEqual({ props: {} })
	})
})

describe('removes can move camera', () => {
	const { up, down } = getTestMigration(instanceVersions.RemoveCanMoveCamera)

	test('up works as expected', () => {
		expect(up({ canMoveCamera: true })).toStrictEqual({})
	})

	test('down works as expected', () => {
		expect(down({})).toStrictEqual({ canMoveCamera: true })
	})
})

describe('Add text align to text shapes', () => {
	const { up, down } = getTestMigration(textShapeVersions.AddTextAlign)

	test('up works as expected', () => {
		expect(up({ props: { align: 'middle' } })).toEqual({ props: { textAlign: 'middle' } })
	})

	test('down works as expected', () => {
		expect(down({ props: { textAlign: 'middle' } })).toEqual({ props: { align: 'middle' } })
	})
})

describe('Extract bindings from arrows', () => {
	const { up } = getTestMigration(arrowShapeVersions.ExtractBindings)

	test('up works as expected', () => {
		expect(
			up({
				'shape:arrow1': {
					id: 'shape:arrow1',
					type: 'arrow',
					props: {
						start: {
							type: 'binding',
							boundShapeId: 'shape:box1',
							normalizedAnchor: {
								x: 0.4383437225516159,
								y: 0.5065334673177019,
							},
							isPrecise: false,
							isExact: false,
						},
						end: {
							type: 'binding',
							boundShapeId: 'shape:box2',
							normalizedAnchor: {
								x: 0.5848167203201774,
								y: 0.5766996080606552,
							},
							isPrecise: false,
							isExact: false,
						},
					},
					typeName: 'shape',
				},
				'shape:arrow2': {
					id: 'shape:arrow2',
					type: 'arrow',
					props: {
						start: {
							type: 'binding',
							boundShapeId: 'shape:arrow2',
							normalizedAnchor: {
								x: 0.4383437225516159,
								y: 0.5065334673177019,
							},
							isPrecise: false,
							isExact: false,
						},
						end: {
							type: 'point',
							x: 174.75451263561803,
							y: -1.4725753187527948,
						},
					},
					typeName: 'shape',
				},
				'shape:arrow3': {
					id: 'shape:arrow3',
					type: 'arrow',
					props: {
						start: {
							type: 'point',
							x: 68.25440152898136,
							y: -1.0404886613512332,
						},
						end: {
							type: 'binding',
							boundShapeId: 'shape:box3',
							normalizedAnchor: {
								x: 0.5848167203201774,
								y: 0.5766996080606552,
							},
							isPrecise: true,
							isExact: false,
						},
					},
					typeName: 'shape',
				},
				'shape:arrow4': {
					id: 'shape:arrow4',
					type: 'arrow',
					props: {
						start: {
							type: 'point',
							x: 68.25440152898136,
							y: -1.0404886613512758,
						},
						end: {
							type: 'point',
							x: 174.75451263561803,
							y: -1.4725753187527948,
						},
					},
					typeName: 'shape',
				},
			})
		).toMatchInlineSnapshot(`
		{
		  "binding:nanoid_1": {
		    "fromId": "shape:arrow1",
		    "id": "binding:nanoid_1",
		    "meta": {},
		    "props": {
		      "isExact": false,
		      "isPrecise": false,
		      "normalizedAnchor": {
		        "x": 0.4383437225516159,
		        "y": 0.5065334673177019,
		      },
		      "terminal": "start",
		    },
		    "toId": "shape:box1",
		    "type": "arrow",
		    "typeName": "binding",
		  },
		  "binding:nanoid_2": {
		    "fromId": "shape:arrow1",
		    "id": "binding:nanoid_2",
		    "meta": {},
		    "props": {
		      "isExact": false,
		      "isPrecise": false,
		      "normalizedAnchor": {
		        "x": 0.5848167203201774,
		        "y": 0.5766996080606552,
		      },
		      "terminal": "end",
		    },
		    "toId": "shape:box2",
		    "type": "arrow",
		    "typeName": "binding",
		  },
		  "binding:nanoid_3": {
		    "fromId": "shape:arrow2",
		    "id": "binding:nanoid_3",
		    "meta": {},
		    "props": {
		      "isExact": false,
		      "isPrecise": false,
		      "normalizedAnchor": {
		        "x": 0.4383437225516159,
		        "y": 0.5065334673177019,
		      },
		      "terminal": "start",
		    },
		    "toId": "shape:arrow2",
		    "type": "arrow",
		    "typeName": "binding",
		  },
		  "binding:nanoid_4": {
		    "fromId": "shape:arrow3",
		    "id": "binding:nanoid_4",
		    "meta": {},
		    "props": {
		      "isExact": false,
		      "isPrecise": true,
		      "normalizedAnchor": {
		        "x": 0.5848167203201774,
		        "y": 0.5766996080606552,
		      },
		      "terminal": "end",
		    },
		    "toId": "shape:box3",
		    "type": "arrow",
		    "typeName": "binding",
		  },
		  "shape:arrow1": {
		    "id": "shape:arrow1",
		    "props": {
		      "end": {
		        "x": 0,
		        "y": 0,
		      },
		      "start": {
		        "x": 0,
		        "y": 0,
		      },
		    },
		    "type": "arrow",
		    "typeName": "shape",
		  },
		  "shape:arrow2": {
		    "id": "shape:arrow2",
		    "props": {
		      "end": {
		        "x": 174.75451263561803,
		        "y": -1.4725753187527948,
		      },
		      "start": {
		        "x": 0,
		        "y": 0,
		      },
		    },
		    "type": "arrow",
		    "typeName": "shape",
		  },
		  "shape:arrow3": {
		    "id": "shape:arrow3",
		    "props": {
		      "end": {
		        "x": 0,
		        "y": 0,
		      },
		      "start": {
		        "x": 68.25440152898136,
		        "y": -1.0404886613512332,
		      },
		    },
		    "type": "arrow",
		    "typeName": "shape",
		  },
		  "shape:arrow4": {
		    "id": "shape:arrow4",
		    "props": {
		      "end": {
		        "x": 174.75451263561803,
		        "y": -1.4725753187527948,
		      },
		      "start": {
		        "x": 68.25440152898136,
		        "y": -1.0404886613512758,
		      },
		    },
		    "type": "arrow",
		    "typeName": "shape",
		  },
		}
	`)
	})
})

describe('Add scale to draw shape', () => {
	const { up, down } = getTestMigration(drawShapeVersions.AddScale)

	test('up works as expected', () => {
		expect(up({ props: {} })).toEqual({ props: { scale: 1 } })
	})

	test('down works as expected', () => {
		expect(down({ props: { scale: 1 } })).toEqual({ props: {} })
	})
})

describe('Add scale to highlight shape', () => {
	const { up, down } = getTestMigration(highlightShapeVersions.AddScale)

	test('up works as expected', () => {
		expect(up({ props: {} })).toEqual({ props: { scale: 1 } })
	})

	test('down works as expected', () => {
		expect(down({ props: { scale: 1 } })).toEqual({ props: {} })
	})
})

describe('Add scale to geo shape', () => {
	const { up, down } = getTestMigration(geoShapeVersions.AddScale)

	test('up works as expected', () => {
		expect(up({ props: {} })).toEqual({ props: { scale: 1 } })
	})

	test('down works as expected', () => {
		expect(down({ props: { scale: 1 } })).toEqual({ props: {} })
	})
})

describe('Add scale to arrow shape', () => {
	const { up, down } = getTestMigration(arrowShapeVersions.AddScale)

	test('up works as expected', () => {
		expect(up({ props: {} })).toEqual({ props: { scale: 1 } })
	})

	test('down works as expected', () => {
		expect(down({ props: { scale: 1 } })).toEqual({ props: {} })
	})
})

describe('Add scale to note shape', () => {
	const { up, down } = getTestMigration(noteShapeVersions.AddScale)

	test('up works as expected', () => {
		expect(up({ props: {} })).toEqual({ props: { scale: 1 } })
	})

	test('down works as expected', () => {
		expect(down({ props: { scale: 1 } })).toEqual({ props: {} })
	})
})

describe('Add scale to line shape', () => {
	const { up, down } = getTestMigration(lineShapeVersions.AddScale)

	test('up works as expected', () => {
		expect(up({ props: {} })).toEqual({ props: { scale: 1 } })
	})

	test('down works as expected', () => {
		expect(down({ props: { scale: 1 } })).toEqual({ props: {} })
	})
})

describe('Make image asset file size optional', () => {
	const { up, down } = getTestMigration(imageAssetVersions.MakeFileSizeOptional)

	test('up works as expected', () => {
		expect(up({ props: { fileSize: -1 } })).toEqual({ props: {} })
		expect(up({ props: { fileSize: 0 } })).toEqual({ props: { fileSize: 0 } })
		expect(up({ props: { fileSize: 1 } })).toEqual({ props: { fileSize: 1 } })
	})

	test('down works as expected', () => {
		expect(down({ props: {} })).toEqual({ props: { fileSize: -1 } })
		expect(down({ props: { fileSize: 0 } })).toEqual({ props: { fileSize: 0 } })
		expect(down({ props: { fileSize: 1 } })).toEqual({ props: { fileSize: 1 } })
	})
})

describe('Add flipX, flipY to image shape', () => {
	const { up, down } = getTestMigration(imageShapeVersions.AddFlipProps)

	test('up works as expected', () => {
		expect(up({ props: {} })).toEqual({ props: { flipX: false, flipY: false } })
	})

	test('down works as expected', () => {
		expect(down({ props: { flipX: false, flipY: false } })).toEqual({ props: {} })
	})
})

describe('Add alt text to image shape', () => {
	const { up, down } = getTestMigration(imageShapeVersions.AddAltText)

	test('up works as expected', () => {
		expect(up({ props: {} })).toEqual({ props: { altText: '' } })
	})

	test('down works as expected', () => {
		expect(down({ props: { altText: 'yo' } })).toEqual({ props: {} })
	})
})

describe('Add alt text to video shape', () => {
	const { up, down } = getTestMigration(videoShapeVersions.AddAltText)

	test('up works as expected', () => {
		expect(up({ props: {} })).toEqual({ props: { altText: '' } })
	})

	test('down works as expected', () => {
		expect(down({ props: { altText: 'yo' } })).toEqual({ props: {} })
	})
})

describe('Make video asset file size optional', () => {
	const { up, down } = getTestMigration(videoAssetVersions.MakeFileSizeOptional)

	test('up works as expected', () => {
		expect(up({ props: { fileSize: -1 } })).toEqual({ props: {} })
		expect(up({ props: { fileSize: 0 } })).toEqual({ props: { fileSize: 0 } })
		expect(up({ props: { fileSize: 1 } })).toEqual({ props: { fileSize: 1 } })
	})

	test('down works as expected', () => {
		expect(down({ props: {} })).toEqual({ props: { fileSize: -1 } })
		expect(down({ props: { fileSize: 0 } })).toEqual({ props: { fileSize: 0 } })
		expect(down({ props: { fileSize: 1 } })).toEqual({ props: { fileSize: 1 } })
	})
})

describe('Adding label color to note shapes', () => {
	const { up, down } = getTestMigration(noteShapeVersions.AddLabelColor)

	test('up works as expected', () => {
		expect(up({ props: {} })).toEqual({ props: { labelColor: 'black' } })
	})

	test('down works as expected', () => {
		expect(down({ props: { labelColor: 'black' } })).toEqual({ props: {} })
	})
})

describe('TLPresence NullableCameraCursor', () => {
	const { up, down } = getTestMigration(instancePresenceVersions.NullableCameraCursor)

	test('up works as expected', () => {
		expect(
			up({
				lastActivityTimestamp: 123,
				followingUserId: null,
				color: '#FF0000',
				camera: { x: 1, y: 2, z: 3 },
				cursor: { type: 'default', x: 1, y: 2, rotation: 3 },
				screenBounds: { x: 0, y: 0, w: 1, h: 1 },
				selectedShapeIds: [],
				brush: null,
				scribbles: [],
				chatMessage: '',
				meta: {},
			})
		).toEqual({
			lastActivityTimestamp: 123,
			followingUserId: null,
			color: '#FF0000',
			camera: { x: 1, y: 2, z: 3 },
			cursor: { type: 'default', x: 1, y: 2, rotation: 3 },
			screenBounds: { x: 0, y: 0, w: 1, h: 1 },
			selectedShapeIds: [],
			brush: null,
			scribbles: [],
			chatMessage: '',
			meta: {},
		})
	})

	test('down works as expected', () => {
		expect(
			down({
				lastActivityTimestamp: null,
				followingUserId: null,
				color: '#FF0000',
				camera: null,
				cursor: null,
				screenBounds: null,
				selectedShapeIds: [],
				brush: null,
				scribbles: [],
				chatMessage: '',
				meta: {},
			})
		).toEqual({
			lastActivityTimestamp: 0,
			followingUserId: null,
			color: '#FF0000',
			camera: { x: 0, y: 0, z: 1 },
			cursor: { type: 'default', x: 0, y: 0, rotation: 0 },
			screenBounds: { x: 0, y: 0, w: 1, h: 1 },
			selectedShapeIds: [],
			brush: null,
			scribbles: [],
			chatMessage: '',
			meta: {},
		})
	})
})

describe('Adding color to frame shapes', () => {
	const { up, down } = getTestMigration(frameShapeVersions.AddColorProp)

	test('up works as expected', () => {
		expect(up({ props: {} })).toEqual({ props: { color: 'black' } })
	})

	test('down works as expected', () => {
		expect(down({ props: { color: 'black' } })).toEqual({ props: {} })
	})
})

describe('Add elbow kind to arrow shape', () => {
	const { up, down } = getTestMigration(arrowShapeVersions.AddElbow)

	test('up works as expected', () => {
		expect(up({ props: {} })).toEqual({ props: { kind: 'arc', elbowMidPoint: 0.5 } })
	})

	test('down works as expected', () => {
		expect(down({ props: { kind: 'arc', elbowMidPoint: 0.5, wow: true } })).toEqual({
			props: { wow: true },
		})
		expect(down({ props: { kind: 'elbow', elbowMidPoint: 0.5, wow: true } })).toEqual({
			props: { wow: true },
		})
	})
})

describe('Add side to arrow binding', () => {
	const { up, down } = getTestMigration(arrowBindingVersions.AddSnap)

	test('up works as expected', () => {
		expect(up({ props: {} })).toEqual({ props: { snap: 'none' } })
	})

	test('down works as expected', () => {
		expect(down({ props: { snap: 'none' } })).toEqual({ props: {} })
		expect(down({ props: { snap: 'edge' } })).toEqual({ props: {} })
	})
})

describe('TLVideoAsset AddAutoplay', () => {
	const { up, down } = getTestMigration(videoShapeVersions.AddAutoplay)

	test('down works as expected', () => {
		expect(up({ props: {} })).toEqual({ props: { autoplay: true } })
		expect(down({ props: { autoplay: true } })).toEqual({ props: {} })
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
