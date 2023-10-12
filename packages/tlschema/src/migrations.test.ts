import { Migrations, Store, createRecordType } from '@tldraw/store'
import fs from 'fs'
import { imageAssetMigrations } from './assets/TLImageAsset'
import { videoAssetMigrations } from './assets/TLVideoAsset'
import { assetMigrations, assetVersions } from './records/TLAsset'
import { cameraMigrations, cameraVersions } from './records/TLCamera'
import { documentMigrations, documentVersions } from './records/TLDocument'
import { instanceMigrations, instanceVersions } from './records/TLInstance'
import { pageMigrations, pageVersions } from './records/TLPage'
import { instancePageStateMigrations, instancePageStateVersions } from './records/TLPageState'
import { pointerMigrations, pointerVersions } from './records/TLPointer'
import { instancePresenceMigrations, instancePresenceVersions } from './records/TLPresence'
import { TLShape, rootShapeMigrations, rootShapeVersions } from './records/TLShape'
import { arrowShapeMigrations } from './shapes/TLArrowShape'
import { bookmarkShapeMigrations } from './shapes/TLBookmarkShape'
import { drawShapeMigrations } from './shapes/TLDrawShape'
import { embedShapeMigrations } from './shapes/TLEmbedShape'
import { GeoShapeVersions, geoShapeMigrations } from './shapes/TLGeoShape'
import { imageShapeMigrations } from './shapes/TLImageShape'
import { lineShapeMigrations, lineShapeVersions } from './shapes/TLLineShape'
import { noteShapeMigrations } from './shapes/TLNoteShape'
import { textShapeMigrations } from './shapes/TLTextShape'
import { videoShapeMigrations } from './shapes/TLVideoShape'
import { storeMigrations, storeVersions } from './store-migrations'

const assetModules = fs
	.readdirSync('src/assets')
	.filter((n) => n.match(/^TL.*\.ts$/))
	.map((f) => [f, require(`./assets/${f.slice(0, -3)}`)])
const shapeModules = fs
	.readdirSync('src/shapes')
	.filter((n) => n.match(/^TL.*\.ts$/))
	.map((f) => [f, require(`./shapes/${f.slice(0, -3)}`)])
const recordModules = fs
	.readdirSync('src/records')
	.filter((n) => n.match(/^TL.*\.ts$/))
	.map((f) => [f, require(`./records/${f.slice(0, -3)}`)])

const allModules = [
	...assetModules,
	...shapeModules,
	...recordModules,
	['store-migrations.ts', require('./store-migrations')],
]

const allMigrators: Array<{
	fileName: string
	version: number
	up: jest.SpyInstance
	down: jest.SpyInstance
}> = []

for (const [fileName, module] of allModules) {
	const migrationsKey = Object.keys(module).find((k) => k.endsWith('igrations'))

	if (!migrationsKey) continue

	const migrations: Migrations = module[migrationsKey]

	for (const version of Object.keys(migrations.migrators)) {
		const originalUp = migrations.migrators[version as any].up
		const originalDown = migrations.migrators[version as any].down
		const up = jest
			.spyOn(migrations.migrators[version as any], 'up')
			.mockImplementation((initialRecord) => {
				if (initialRecord instanceof Store) return originalUp(initialRecord)

				const clonedRecord = structuredClone(initialRecord)
				const result = originalUp(initialRecord)
				// mutations should never mutate their input
				expect(initialRecord).toEqual(clonedRecord)
				return result
			})
		const down = jest
			.spyOn(migrations.migrators[version as any], 'down')
			.mockImplementation((initialRecord) => {
				if (initialRecord instanceof Store) return originalDown(initialRecord)

				const clonedRecord = structuredClone(initialRecord)
				const result = originalDown(initialRecord)
				// mutations should never mutate their input
				expect(initialRecord).toEqual(clonedRecord)
				return result
			})
		allMigrators.push({
			fileName,
			version: Number(version),
			up,
			down,
		})
	}
}

test('all modules export migrations', () => {
	const modulesWithoutMigrations = allModules
		.filter(([, module]) => {
			return !Object.keys(module).find((k) => k.endsWith('igrations'))
		})
		.map(([fileName]) => fileName)
		.filter((n) => !(n === 'TLBaseAsset.ts' || n === 'TLBaseShape.ts' || n === 'TLRecord.ts'))

	// IF THIS LINE IS FAILING YOU NEED TO MAKE SURE THE MIGRATIONS ARE EXPORTED
	expect(modulesWithoutMigrations).toHaveLength(0)
})

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

	const { up, down } = videoAssetMigrations.migrators[1]

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

	const { up, down } = imageAssetMigrations.migrators[1]

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
		const fixed = storeMigrations.migrators[storeVersions.RemoveCodeAndIconShapeTypes].up(snapshot)
		expect(Object.entries(fixed)).toHaveLength(1)
	})

	test('down works as expected', () => {
		const snapshot = Object.fromEntries(
			[
				ShapeRecord.create({
					type: 'geo',
					parentId: 'page:any',
					index: 'a0',
					props: { geo: 'rectangle', name: 'e', w: 1, h: 1, growY: 1, text: '' },
				} as any),
			].map((shape) => [shape.id, shape])
		)

		storeMigrations.migrators[storeVersions.RemoveCodeAndIconShapeTypes].down(snapshot)
		expect(Object.entries(snapshot)).toHaveLength(1)
	})
})

describe('Adding export background', () => {
	const { up, down } = instanceMigrations.migrators[1]
	test('up works as expected', () => {
		const before = {}
		const after = { exportBackground: true }
		expect(up(before)).toStrictEqual(after)
	})

	test('down works as expected', () => {
		const before = { exportBackground: true }
		const after = {}
		expect(down(before)).toStrictEqual(after)
	})
})

describe('Removing dialogs from instance', () => {
	const { up, down } = instanceMigrations.migrators[2]
	test('up works as expected', () => {
		const before = { dialog: null }
		const after = {}
		expect(up(before)).toStrictEqual(after)
	})

	test('down works as expected', () => {
		const before = {}
		const after = { dialog: null }
		expect(down(before)).toStrictEqual(after)
	})
})

describe('Adding url props', () => {
	for (const [name, { up, down }] of [
		['video shape', videoShapeMigrations.migrators[1]],
		['note shape', noteShapeMigrations.migrators[1]],
		['geo shape', geoShapeMigrations.migrators[1]],
		['image shape', imageShapeMigrations.migrators[1]],
	] as const) {
		test(`${name}: up works as expected`, () => {
			const before = { props: {} }
			const after = { props: { url: '' } }
			expect(up(before)).toStrictEqual(after)
		})

		test(`${name}: down works as expected`, () => {
			const before = { props: { url: '' } }
			const after = { props: {} }
			expect(down(before)).toStrictEqual(after)
		})
	}
})

describe('Bookmark null asset id', () => {
	const { up, down } = bookmarkShapeMigrations.migrators[1]
	test('up works as expected', () => {
		const before = { props: {} }
		const after = { props: { assetId: null } }
		expect(up(before)).toStrictEqual(after)
	})

	test('down works as expected', () => {
		const before = { props: { assetId: null } }
		const after = { props: {} }
		expect(down(before)).toStrictEqual(after)
	})
})

describe('Renaming asset props', () => {
	for (const [name, { up, down }] of [
		['image shape', imageAssetMigrations.migrators[2]],
		['video shape', videoAssetMigrations.migrators[2]],
	] as const) {
		test(`${name}: up works as expected`, () => {
			const before = { props: { width: 100, height: 100 } }
			const after = { props: { w: 100, h: 100 } }
			expect(up(before)).toStrictEqual(after)
		})

		test(`${name}: down works as expected`, () => {
			const before = { props: { w: 100, h: 100 } }
			const after = { props: { width: 100, height: 100 } }
			expect(down(before)).toStrictEqual(after)
		})
	}
})

describe('Adding instance.isToolLocked', () => {
	const { up, down } = instanceMigrations.migrators[3]
	test('up works as expected', () => {
		expect(up({})).toMatchObject({ isToolLocked: false })
		expect(up({ isToolLocked: true })).toMatchObject({ isToolLocked: false })
	})

	test('down works as expected', () => {
		expect(down({ isToolLocked: true })).toStrictEqual({})
		expect(down({ isToolLocked: false })).toStrictEqual({})
	})
})

describe('Cleaning up junk data in instance.propsForNextShape', () => {
	const { up, down } = instanceMigrations.migrators[4]
	test('up works as expected', () => {
		expect(up({ propsForNextShape: { color: 'red', unknown: 'gone' } })).toEqual({
			propsForNextShape: {
				color: 'red',
			},
		})
	})

	test('down works as expected', () => {
		const instance = { propsForNextShape: { color: 'red' } }
		expect(down(instance)).toBe(instance)
	})
})

describe('Generating original URL from embed URL in GenOriginalUrlInEmbed', () => {
	const { up, down } = embedShapeMigrations.migrators[1]
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

	test('down works as expected', () => {
		const instance = {
			props: {
				url: 'https://codepen.io/Rplus/pen/PWZYRM',
				tmpOldUrl: 'https://codepen.io/Rplus/embed/PWZYRM',
			},
		}
		expect(down(instance)).toEqual({ props: { url: 'https://codepen.io/Rplus/embed/PWZYRM' } })
	})

	test('invalid down works as expected', () => {
		const instance = {
			props: {
				url: 'https://example.com',
				tmpOldUrl: '',
			},
		}
		expect(down(instance)).toEqual({ props: { url: '' } })
	})
})

describe('Adding isPen prop', () => {
	const { up, down } = drawShapeMigrations.migrators[1]

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

	test('down works as expected', () => {
		expect(down({ props: { isPen: false } })).toEqual({
			props: {},
		})
	})
})

describe('Adding isLocked prop', () => {
	const { up, down } = rootShapeMigrations.migrators[1]

	test('up works as expected', () => {
		expect(up({})).toEqual({ isLocked: false })
	})

	test('down works as expected', () => {
		expect(down({ isLocked: false })).toEqual({})
	})
})

describe('Adding labelColor prop to geo / arrow shapes', () => {
	for (const [name, { up, down }] of [
		['arrow shape', arrowShapeMigrations.migrators[1]],
		['geo shape', geoShapeMigrations.migrators[2]],
	] as const) {
		test(`${name}: up works as expected`, () => {
			expect(up({ props: { color: 'red' } })).toEqual({
				props: { color: 'red', labelColor: 'black' },
			})
		})

		test(`${name}: down works as expected`, () => {
			expect(down({ props: { color: 'red', labelColor: 'blue' } })).toEqual({
				props: { color: 'red' },
			})
		})
	}
})

describe('Adding labelColor prop to propsForNextShape', () => {
	const { up, down } = instanceMigrations.migrators[5]
	test('up works as expected', () => {
		expect(up({ propsForNextShape: { color: 'red' } })).toEqual({
			propsForNextShape: { color: 'red', labelColor: 'black' },
		})
	})

	test('down works as expected', () => {
		expect(down({ propsForNextShape: { color: 'red', labelColor: 'blue' } })).toEqual({
			propsForNextShape: { color: 'red' },
		})
	})
})

describe('Adding croppingShapeId to instancePageState', () => {
	const { up, down } = instancePageStateMigrations.migrators[1]
	test('up works as expected', () => {
		expect(up({})).toEqual({
			croppingShapeId: null,
		})
	})

	test('down works as expected', () => {
		expect(down({ croppingShapeId: null })).toEqual({})
	})
})

describe('Renaming properties in instancePageState', () => {
	const { up, down } =
		instancePageStateMigrations.migrators[instancePageStateVersions.RenameProperties]
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
	const { up, down } =
		instancePageStateMigrations.migrators[instancePageStateVersions.RenamePropertiesAgain]
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
	const { up, down } = instanceMigrations.migrators[6]
	test('up works as expected', () => {
		expect(up({})).toEqual({ followingUserId: null })
	})

	test('down works as expected', () => {
		expect(down({ followingUserId: '123' })).toEqual({})
	})
})

describe('Removing align=justify from propsForNextShape', () => {
	const { up, down } = instanceMigrations.migrators[7]
	test('up works as expected', () => {
		expect(up({ propsForNextShape: { color: 'black', align: 'justify' } })).toEqual({
			propsForNextShape: { color: 'black', align: 'start' },
		})
		expect(up({ propsForNextShape: { color: 'black', align: 'end' } })).toEqual({
			propsForNextShape: { color: 'black', align: 'end' },
		})
	})

	test('down works as expected', () => {
		expect(down({ propsForNextShape: { color: 'black', align: 'end' } })).toEqual({
			propsForNextShape: { color: 'black', align: 'end' },
		})
	})
})

describe('Adding zoomBrush prop to instance', () => {
	const { up, down } = instanceMigrations.migrators[8]
	test('up works as expected', () => {
		expect(up({})).toEqual({ zoomBrush: null })
	})

	test('down works as expected', () => {
		expect(down({ zoomBrush: { x: 1, y: 2, w: 3, h: 4 } })).toEqual({})
	})
})

describe('Removing align=justify from shape align props', () => {
	for (const [name, { up, down }] of [
		['text', textShapeMigrations.migrators[1]],
		['note', noteShapeMigrations.migrators[2]],
		['geo', geoShapeMigrations.migrators[3]],
	] as const) {
		test(`${name}: up works as expected`, () => {
			expect(up({ props: { align: 'justify' } })).toEqual({
				props: { align: 'start' },
			})
			expect(up({ props: { align: 'end' } })).toEqual({
				props: { align: 'end' },
			})
		})

		test(`${name}: down works as expected`, () => {
			expect(down({ props: { align: 'start' } })).toEqual({
				props: { align: 'start' },
			})
		})
	}
})

describe('Add crop=null to image shapes', () => {
	const { up, down } = imageShapeMigrations.migrators[2]
	test('up works as expected', () => {
		expect(up({ props: { w: 100 } })).toEqual({
			props: { w: 100, crop: null },
		})
	})

	test('down works as expected', () => {
		expect(down({ props: { w: 100, crop: null } })).toEqual({
			props: { w: 100 },
		})
	})
})

describe('Adding instance_presence to the schema', () => {
	const { up, down } = storeMigrations.migrators[storeVersions.AddInstancePresenceType]

	test('up works as expected', () => {
		expect(up({})).toEqual({})
	})
	test('down works as expected', () => {
		expect(
			down({
				'instance_presence:123': { id: 'instance_presence:123', typeName: 'instance_presence' },
				'instance:123': { id: 'instance:123', typeName: 'instance' },
			})
		).toEqual({
			'instance:123': { id: 'instance:123', typeName: 'instance' },
		})
	})
})

describe('Adding name to document', () => {
	const { up, down } = documentMigrations.migrators[1]

	test('up works as expected', () => {
		expect(up({})).toEqual({ name: '' })
	})

	test('down works as expected', () => {
		expect(down({ name: '' })).toEqual({})
	})
})

describe('Adding check-box to geo shape', () => {
	const { up, down } = geoShapeMigrations.migrators[4]

	test('up works as expected', () => {
		expect(up({ props: { geo: 'rectangle' } })).toEqual({ props: { geo: 'rectangle' } })
	})
	test('down works as expected', () => {
		expect(down({ props: { geo: 'rectangle' } })).toEqual({ props: { geo: 'rectangle' } })
		expect(down({ props: { geo: 'check-box' } })).toEqual({ props: { geo: 'rectangle' } })
	})
})

describe('Add verticalAlign to geo shape', () => {
	const { up, down } = geoShapeMigrations.migrators[5]

	test('up works as expected', () => {
		expect(up({ props: { type: 'ellipse' } })).toEqual({
			props: { type: 'ellipse', verticalAlign: 'middle' },
		})
	})
	test('down works as expected', () => {
		expect(down({ props: { verticalAlign: 'middle', type: 'ellipse' } })).toEqual({
			props: { type: 'ellipse' },
		})
	})
})

describe('Add verticalAlign to props for next shape', () => {
	const { up, down } = instanceMigrations.migrators[9]
	test('up works as expected', () => {
		expect(up({ propsForNextShape: { color: 'red' } })).toEqual({
			propsForNextShape: {
				color: 'red',
				verticalAlign: 'middle',
			},
		})
	})

	test('down works as expected', () => {
		const instance = { propsForNextShape: { color: 'red', verticalAlign: 'middle' } }
		expect(down(instance)).toEqual({
			propsForNextShape: {
				color: 'red',
			},
		})
	})
})

describe('Migrate GeoShape legacy horizontal alignment', () => {
	const { up, down } = geoShapeMigrations.migrators[6]

	test('up works as expected', () => {
		expect(up({ props: { align: 'start', type: 'ellipse' } })).toEqual({
			props: { align: 'start-legacy', type: 'ellipse' },
		})
		expect(up({ props: { align: 'middle', type: 'ellipse' } })).toEqual({
			props: { align: 'middle-legacy', type: 'ellipse' },
		})
		expect(up({ props: { align: 'end', type: 'ellipse' } })).toEqual({
			props: { align: 'end-legacy', type: 'ellipse' },
		})
	})
	test('down works as expected', () => {
		expect(down({ props: { align: 'start-legacy', type: 'ellipse' } })).toEqual({
			props: { align: 'start', type: 'ellipse' },
		})
		expect(down({ props: { align: 'middle-legacy', type: 'ellipse' } })).toEqual({
			props: { align: 'middle', type: 'ellipse' },
		})
		expect(down({ props: { align: 'end-legacy', type: 'ellipse' } })).toEqual({
			props: { align: 'end', type: 'ellipse' },
		})
	})
})

describe('adding cloud shape', () => {
	const { up, down } = geoShapeMigrations.migrators[GeoShapeVersions.AddCloud]

	test('up does nothing', () => {
		expect(up({ props: { geo: 'rectangle' } })).toEqual({
			props: { geo: 'rectangle' },
		})
	})

	test('down converts clouds to rectangles', () => {
		expect(down({ props: { geo: 'cloud' } })).toEqual({
			props: { geo: 'rectangle' },
		})
	})
})

describe('Migrate NoteShape legacy horizontal alignment', () => {
	const { up, down } = noteShapeMigrations.migrators[3]

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
	test('down works as expected', () => {
		expect(down({ props: { align: 'start-legacy', color: 'red' } })).toEqual({
			props: { align: 'start', color: 'red' },
		})
		expect(down({ props: { align: 'middle-legacy', color: 'red' } })).toEqual({
			props: { align: 'middle', color: 'red' },
		})
		expect(down({ props: { align: 'end-legacy', color: 'red' } })).toEqual({
			props: { align: 'end', color: 'red' },
		})
	})
})

describe('Adds delay to scribble', () => {
	const { up, down } = instanceMigrations.migrators[10]

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

	test('down has no effect when scribble is null', () => {
		expect(down({ scribble: null })).toEqual({ scribble: null })
	})

	test('removes the delay property', () => {
		expect(
			down({
				scribble: {
					points: [{ x: 0, y: 0 }],
					size: 4,
					color: 'black',
					opacity: 1,
					state: 'starting',
					delay: 0,
				},
			})
		).toEqual({
			scribble: {
				points: [{ x: 0, y: 0 }],
				size: 4,
				color: 'black',
				opacity: 1,
				state: 'starting',
			},
		})
	})
})

describe('Adds delay to scribble', () => {
	const { up, down } = instancePresenceMigrations.migrators[1]

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

	test('down has no effect when scribble is null', () => {
		expect(down({ scribble: null })).toEqual({ scribble: null })
	})

	test('removes the delay property', () => {
		expect(
			down({
				scribble: {
					points: [{ x: 0, y: 0 }],
					size: 4,
					color: 'black',
					opacity: 1,
					state: 'starting',
					delay: 0,
				},
			})
		).toEqual({
			scribble: {
				points: [{ x: 0, y: 0 }],
				size: 4,
				color: 'black',
				opacity: 1,
				state: 'starting',
			},
		})
	})
})

describe('user config refactor', () => {
	test('removes user and user_presence types from snapshots', () => {
		const { up, down } =
			storeMigrations.migrators[storeVersions.RemoveTLUserAndPresenceAndAddPointer]

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
		// down cannot add them back so it should be a no-op
		expect(
			down({
				...nextSnapshot,
				'pointer:134': {
					id: 'pointer:134',
					typeName: 'pointer',
				},
			})
		).toEqual(nextSnapshot)
	})

	test('removes userId from the instance state', () => {
		const { up, down } = instanceMigrations.migrators[instanceVersions.RemoveUserId]

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
		// it cannot be added back so it should add some meaningless id in there
		// in practice, because we bumped the store version, this down migrator will never be used
		expect(down(next)).toMatchInlineSnapshot(`
		Object {
		  "id": "instance:123",
		  "typeName": "instance",
		  "userId": "user:none",
		}
	`)
	})
})

describe('making instance state independent', () => {
	it('adds isPenMode and isGridMode to instance state', () => {
		const { up, down } = instanceMigrations.migrators[instanceVersions.AddIsPenModeAndIsGridMode]

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
		expect(down(next)).toEqual(prev)
	})

	it('removes instanceId and cameraId from instancePageState', () => {
		const { up, down } =
			instancePageStateMigrations.migrators[instancePageStateVersions.RemoveInstanceIdAndCameraId]

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
		// down should never be called
		expect(down(next)).toMatchInlineSnapshot(`
		Object {
		  "cameraId": "camera:void",
		  "id": "instance_page_state:123",
		  "instanceId": "instance:instance",
		  "selectedShapeIds": Array [],
		  "typeName": "instance_page_state",
		}
	`)
	})

	it('removes instanceId from instancePresence', () => {
		const { up, down } =
			instancePresenceMigrations.migrators[instancePresenceVersions.RemoveInstanceId]

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

		// down should never be called
		expect(down(next)).toMatchInlineSnapshot(`
		Object {
		  "id": "instance_presence:123",
		  "instanceId": "instance:instance",
		  "selectedShapeIds": Array [],
		  "typeName": "instance_presence",
		}
	`)
	})

	it('removes userDocument from the schema', () => {
		const { up, down } = storeMigrations.migrators[storeVersions.RemoveUserDocument]

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
		expect(down(next)).toEqual(next)
	})
})

describe('Adds NoteShape vertical alignment', () => {
	const { up, down } = noteShapeMigrations.migrators[4]

	test('up works as expected', () => {
		expect(up({ props: { color: 'red' } })).toEqual({
			props: { verticalAlign: 'middle', color: 'red' },
		})
	})
	test('down works as expected', () => {
		expect(down({ props: { verticalAlign: 'top', color: 'red' } })).toEqual({
			props: { color: 'red' },
		})
	})
})

describe('hoist opacity', () => {
	test('hoists opacity from a shape to another', () => {
		const { up, down } = rootShapeMigrations.migrators[rootShapeVersions.HoistOpacity]
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
		const afterWithNonMatchingOpacity = {
			type: 'myShape',
			x: 0,
			y: 0,
			opacity: 0.6,
			props: {
				color: 'red',
			},
		}

		expect(up(before)).toEqual(after)
		expect(down(after)).toEqual(before)
		expect(down(afterWithNonMatchingOpacity)).toEqual(before)
	})

	test('hoists opacity from propsForNextShape', () => {
		const { up, down } = instanceMigrations.migrators[instanceVersions.HoistOpacity]
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
		const afterWithNonMatchingOpacity = {
			isToolLocked: true,
			opacityForNextShape: 0.6,
			propsForNextShape: {
				color: 'black',
			},
		}

		expect(up(before)).toEqual(after)
		expect(down(after)).toEqual(before)
		expect(down(afterWithNonMatchingOpacity)).toEqual(before)
	})
})

describe('Adds highlightedUserIds to instance', () => {
	const { up, down } = instanceMigrations.migrators[instanceVersions.AddHighlightedUserIds]

	test('up works as expected', () => {
		expect(up({})).toEqual({ highlightedUserIds: [] })
	})

	test('down works as expected', () => {
		expect(down({ highlightedUserIds: [] })).toEqual({})
	})
})

describe('Adds chat message to presence', () => {
	const { up, down } = instancePresenceMigrations.migrators[3]

	test('up adds the chatMessage property', () => {
		expect(up({})).toEqual({ chatMessage: '' })
	})

	test('down removes the chatMessage property', () => {
		expect(down({ chatMessage: '' })).toEqual({})
	})
})

describe('Adds chat properties to instance', () => {
	const { up, down } = instanceMigrations.migrators[14]

	test('up adds the chatMessage property', () => {
		expect(up({})).toEqual({ chatMessage: '', isChatting: false })
	})

	test('down removes the chatMessage property', () => {
		expect(down({ chatMessage: '', isChatting: true })).toEqual({})
	})
})

describe('Removes does resize from embed', () => {
	const { up, down } = embedShapeMigrations.migrators[2]
	test('up works as expected', () => {
		expect(up({ props: { url: 'https://tldraw.com', doesResize: true } })).toEqual({
			props: { url: 'https://tldraw.com' },
		})
	})
	test('down works as expected', () => {
		expect(down({ props: { url: 'https://tldraw.com' } })).toEqual({
			props: { url: 'https://tldraw.com', doesResize: true },
		})
	})
})

describe('Removes tmpOldUrl from embed', () => {
	const { up, down } = embedShapeMigrations.migrators[3]
	test('up works as expected', () => {
		expect(up({ props: { url: 'https://tldraw.com', tmpOldUrl: 'https://tldraw.com' } })).toEqual({
			props: { url: 'https://tldraw.com' },
		})
	})
	test('down works as expected', () => {
		expect(down({ props: { url: 'https://tldraw.com' } })).toEqual({
			props: { url: 'https://tldraw.com' },
		})
	})
})

describe('Removes overridePermissions from embed', () => {
	const { up, down } = embedShapeMigrations.migrators[4]

	test('up works as expected', () => {
		expect(
			up({ props: { url: 'https://tldraw.com', overridePermissions: { display: 'maybe' } } })
		).toEqual({
			props: { url: 'https://tldraw.com' },
		})
	})
	test('down works as expected', () => {
		expect(down({ props: { url: 'https://tldraw.com' } })).toEqual({
			props: { url: 'https://tldraw.com' },
		})
	})
})

describe('propsForNextShape -> stylesForNextShape', () => {
	test('deletes propsForNextShape and adds stylesForNextShape without trying to bring across contents', () => {
		const { up, down } =
			instanceMigrations.migrators[instanceVersions.ReplacePropsForNextShapeWithStylesForNextShape]
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
		const afterDown = {
			isToolLocked: true,
			propsForNextShape: {
				color: 'black',
				labelColor: 'black',
				dash: 'draw',
				fill: 'none',
				size: 'm',
				icon: 'file',
				font: 'draw',
				align: 'middle',
				verticalAlign: 'middle',
				geo: 'rectangle',
				arrowheadStart: 'none',
				arrowheadEnd: 'arrow',
				spline: 'line',
			},
		}

		expect(up(beforeUp)).toEqual(afterUp)
		expect(down(afterUp)).toEqual(afterDown)
	})
})

describe('adds meta ', () => {
	const metaMigrations = [
		assetMigrations.migrators[assetVersions.AddMeta],
		cameraMigrations.migrators[cameraVersions.AddMeta],
		documentMigrations.migrators[documentVersions.AddMeta],
		instanceMigrations.migrators[instanceVersions.AddMeta],
		instancePageStateMigrations.migrators[instancePageStateVersions.AddMeta],
		instancePresenceMigrations.migrators[instancePresenceVersions.AddMeta],
		pageMigrations.migrators[pageVersions.AddMeta],
		pointerMigrations.migrators[pointerVersions.AddMeta],
		rootShapeMigrations.migrators[rootShapeVersions.AddMeta],
	]

	for (const { up, down } of metaMigrations) {
		test('up works as expected', () => {
			expect(up({})).toStrictEqual({ meta: {} })
		})

		test('down works as expected', () => {
			expect(down({ meta: {} })).toStrictEqual({})
		})
	}
})

describe('removes cursor color', () => {
	const { up, down } = instanceMigrations.migrators[instanceVersions.RemoveCursorColor]

	test('up works as expected', () => {
		expect(
			up({
				cursor: {
					type: 'default',
					rotation: 0.1,
					color: 'black',
				},
			})
		).toStrictEqual({
			cursor: {
				type: 'default',
				rotation: 0.1,
			},
		})
	})

	test('down works as expected', () => {
		expect(
			down({
				cursor: {
					type: 'default',
					rotation: 0.1,
				},
			})
		).toStrictEqual({
			cursor: {
				type: 'default',
				rotation: 0.1,
				color: 'black',
			},
		})
	})
})

describe('adds lonely properties', () => {
	const { up, down } = instanceMigrations.migrators[instanceVersions.AddLonelyProperties]

	test('up works as expected', () => {
		expect(up({})).toStrictEqual({
			canMoveCamera: true,
			isFocused: false,
			devicePixelRatio: 1,
			isCoarsePointer: false,
			openMenus: [],
			isChangingStyle: false,
			isReadOnly: false,
		})
	})

	test('down works as expected', () => {
		expect(
			down({
				canMoveCamera: true,
				isFocused: false,
				devicePixelRatio: 1,
				isCoarsePointer: false,
				openMenus: [],
				isChangingStyle: false,
				isReadOnly: false,
			})
		).toStrictEqual({})
	})
})

describe('rename isReadOnly to isReadonly', () => {
	const { up, down } = instanceMigrations.migrators[instanceVersions.ReadOnlyReadonly]

	test('up works as expected', () => {
		expect(up({ isReadOnly: false })).toStrictEqual({
			isReadonly: false,
		})
	})

	test('down works as expected', () => {
		expect(down({ isReadonly: false })).toStrictEqual({
			isReadOnly: false,
		})
	})
})

describe('Renames selectedShapeIds in presence', () => {
	const { up, down } =
		instancePresenceMigrations.migrators[instancePresenceVersions.RenameSelectedShapeIds]

	test('up adds the chatMessage property', () => {
		expect(up({ selectedShapeIds: [] })).toEqual({ selectedShapeIds: [] })
	})

	test('down removes the chatMessage property', () => {
		expect(down({ selectedShapeIds: [] })).toEqual({ selectedShapeIds: [] })
	})
})

describe('Adding canSnap to line handles', () => {
	const { up, down } = lineShapeMigrations.migrators[lineShapeVersions.AddSnapHandles]

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

	test(`down works as expected`, () => {
		expect(
			down({
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
		).toEqual({
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
	})
})

describe('add isHoveringCanvas to TLInstance', () => {
	const { up, down } = instanceMigrations.migrators[instanceVersions.AddHoveringCanvas]

	test('up works as expected', () => {
		expect(up({})).toEqual({ isHoveringCanvas: null })
	})

	test('down works as expected', () => {
		expect(down({ isHoveringCanvas: null })).toEqual({})
	})
})

/* ---  PUT YOUR MIGRATIONS TESTS ABOVE HERE --- */

for (const migrator of allMigrators) {
	test(`[${migrator.fileName} v${migrator.version}] up and down migrations have both been tested`, () => {
		expect(migrator.up).toHaveBeenCalled()
		expect(migrator.down).toHaveBeenCalled()
	})
}
