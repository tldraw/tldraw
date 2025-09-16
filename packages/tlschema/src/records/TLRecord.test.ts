import { describe, expect, it } from 'vitest'
import { TLAsset } from './TLAsset'
import { TLBinding } from './TLBinding'
import { TLCamera } from './TLCamera'
import { TLDocument } from './TLDocument'
import { TLInstance } from './TLInstance'
import { TLPage } from './TLPage'
import { TLInstancePageState } from './TLPageState'
import { TLPointer } from './TLPointer'
import { TLInstancePresence } from './TLPresence'
import { TLRecord } from './TLRecord'
import { TLShape } from './TLShape'

describe('TLRecord', () => {
	it('should be a union of all record types', () => {
		// Create sample records of each type
		const asset: TLAsset = {
			id: 'asset:test' as any,
			typeName: 'asset',
			type: 'image',
			props: { src: '', w: 100, h: 100, mimeType: 'image/png', name: 'test', isAnimated: false },
			meta: {},
		}

		const binding: TLBinding = {
			id: 'binding:test' as any,
			typeName: 'binding',
			type: 'arrow',
			fromId: 'shape:from' as any,
			toId: 'shape:to' as any,
			props: {},
			meta: {},
		}

		const camera: TLCamera = {
			id: 'camera:test' as any,
			typeName: 'camera',
			x: 0,
			y: 0,
			z: 1,
			meta: {},
		}

		const document: TLDocument = {
			id: 'document:document' as any,
			typeName: 'document',
			gridSize: 10,
			name: 'Test Document',
			meta: {},
		}

		const instance: TLInstance = {
			id: 'instance:instance' as any,
			typeName: 'instance',
			currentPageId: 'page:main' as any,
			opacityForNextShape: 1,
			stylesForNextShape: {},
			followingUserId: null,
			highlightedUserIds: [],
			brush: null,
			cursor: { type: 'default', rotation: 0 },
			scribbles: [],
			isFocusMode: false,
			isDebugMode: false,
			isToolLocked: false,
			exportBackground: false,
			screenBounds: { x: 0, y: 0, w: 1080, h: 720 },
			insets: [false, false, false, false],
			zoomBrush: null,
			chatMessage: '',
			isChatting: false,
			isPenMode: false,
			isGridMode: false,
			isFocused: false,
			devicePixelRatio: 1,
			isCoarsePointer: false,
			isHoveringCanvas: null,
			openMenus: [],
			isChangingStyle: false,
			isReadonly: false,
			meta: {},
			duplicateProps: null,
		}

		const instancePageState: TLInstancePageState = {
			id: 'instance_page_state:test' as any,
			typeName: 'instance_page_state',
			pageId: 'page:main' as any,
			selectedShapeIds: [],
			hintingShapeIds: [],
			erasingShapeIds: [],
			hoveredShapeId: null,
			editingShapeId: null,
			croppingShapeId: null,
			focusedGroupId: null,
			meta: {},
		}

		const page: TLPage = {
			id: 'page:test' as any,
			typeName: 'page',
			name: 'Test Page',
			index: 'a1' as any,
			meta: {},
		}

		const shape: TLShape = {
			id: 'shape:test' as any,
			typeName: 'shape',
			type: 'geo',
			x: 0,
			y: 0,
			rotation: 0,
			index: 'a1' as any,
			parentId: 'page:main' as any,
			isLocked: false,
			opacity: 1,
			props: {
				geo: 'rectangle',
				w: 100,
				h: 100,
				color: 'black',
				fill: 'none',
				dash: 'draw',
				size: 'm',
			},
			meta: {},
		}

		const instancePresence: TLInstancePresence = {
			id: 'instance_presence:test' as any,
			typeName: 'instance_presence',
			userId: 'user123',
			userName: 'Test User',
			lastActivityTimestamp: null,
			color: '#FF0000',
			camera: null,
			selectedShapeIds: [],
			currentPageId: 'page:main' as any,
			brush: null,
			scribbles: [],
			screenBounds: null,
			followingUserId: null,
			cursor: null,
			chatMessage: '',
			meta: {},
		}

		const pointer: TLPointer = {
			id: 'pointer:pointer' as any,
			typeName: 'pointer',
			x: 0,
			y: 0,
			lastActivityTimestamp: 0,
			meta: {},
		}

		// Test that all records are assignable to TLRecord
		const records: TLRecord[] = [
			asset,
			binding,
			camera,
			document,
			instance,
			instancePageState,
			page,
			shape,
			instancePresence,
			pointer,
		]

		// Verify we can access common BaseRecord properties
		records.forEach((record) => {
			expect(typeof record.id).toBe('string')
			expect(typeof record.typeName).toBe('string')
			expect(typeof record.meta).toBe('object')
		})

		// Verify specific type names
		expect(records.find((r) => r.typeName === 'asset')).toBeDefined()
		expect(records.find((r) => r.typeName === 'binding')).toBeDefined()
		expect(records.find((r) => r.typeName === 'camera')).toBeDefined()
		expect(records.find((r) => r.typeName === 'document')).toBeDefined()
		expect(records.find((r) => r.typeName === 'instance')).toBeDefined()
		expect(records.find((r) => r.typeName === 'instance_page_state')).toBeDefined()
		expect(records.find((r) => r.typeName === 'page')).toBeDefined()
		expect(records.find((r) => r.typeName === 'shape')).toBeDefined()
		expect(records.find((r) => r.typeName === 'instance_presence')).toBeDefined()
		expect(records.find((r) => r.typeName === 'pointer')).toBeDefined()
	})

	it('should allow type discrimination by typeName', () => {
		const records: TLRecord[] = [
			{
				id: 'asset:image' as any,
				typeName: 'asset',
				type: 'image',
				props: {
					src: 'test.png',
					w: 100,
					h: 100,
					mimeType: 'image/png',
					name: 'test',
					isAnimated: false,
				},
				meta: {},
			},
			{
				id: 'shape:rect' as any,
				typeName: 'shape',
				type: 'geo',
				x: 10,
				y: 20,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				props: {
					geo: 'rectangle',
					w: 100,
					h: 100,
					color: 'black',
					fill: 'none',
					dash: 'draw',
					size: 'm',
				},
				meta: {},
			},
			{
				id: 'page:main' as any,
				typeName: 'page',
				name: 'Main Page',
				index: 'a1' as any,
				meta: {},
			},
		]

		// Type discrimination should work
		records.forEach((record) => {
			switch (record.typeName) {
				case 'asset':
					expect(record.type).toBeDefined() // Asset-specific property
					expect('props' in record).toBe(true)
					break
				case 'shape':
					expect(record.x).toBeDefined() // Shape-specific property
					expect(record.y).toBeDefined()
					expect('props' in record).toBe(true)
					break
				case 'page':
					expect(record.name).toBeDefined() // Page-specific property
					expect(record.index).toBeDefined()
					break
				case 'binding':
					expect('fromId' in record).toBe(false) // Not a binding
					break
				case 'camera':
					expect('z' in record).toBe(false) // Not a camera
					break
				default:
					// Should handle all cases
					break
			}
		})
	})

	it('should support filtering by record type', () => {
		const mixedRecords: TLRecord[] = [
			{
				id: 'shape:1' as any,
				typeName: 'shape',
				type: 'geo',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				props: {
					geo: 'rectangle',
					w: 50,
					h: 50,
					color: 'red',
					fill: 'solid',
					dash: 'draw',
					size: 's',
				},
				meta: {},
			},
			{
				id: 'page:1' as any,
				typeName: 'page',
				name: 'Page 1',
				index: 'a1' as any,
				meta: {},
			},
			{
				id: 'shape:2' as any,
				typeName: 'shape',
				type: 'text',
				x: 100,
				y: 100,
				rotation: 0,
				index: 'a2' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				props: { text: 'Hello', color: 'black', size: 'm', font: 'draw', align: 'middle', w: 100 },
				meta: {},
			},
			{
				id: 'asset:1' as any,
				typeName: 'asset',
				type: 'image',
				props: {
					src: 'image.jpg',
					w: 200,
					h: 150,
					mimeType: 'image/jpeg',
					name: 'photo',
					isAnimated: false,
				},
				meta: {},
			},
		]

		// Filter shapes
		const shapes = mixedRecords.filter((record): record is TLShape => record.typeName === 'shape')
		expect(shapes).toHaveLength(2)
		shapes.forEach((shape) => {
			expect(shape.typeName).toBe('shape')
			expect(typeof shape.x).toBe('number')
			expect(typeof shape.y).toBe('number')
		})

		// Filter pages
		const pages = mixedRecords.filter((record): record is TLPage => record.typeName === 'page')
		expect(pages).toHaveLength(1)
		pages.forEach((page) => {
			expect(page.typeName).toBe('page')
			expect(typeof page.name).toBe('string')
		})

		// Filter assets
		const assets = mixedRecords.filter((record): record is TLAsset => record.typeName === 'asset')
		expect(assets).toHaveLength(1)
		assets.forEach((asset) => {
			expect(asset.typeName).toBe('asset')
			expect(typeof asset.type).toBe('string')
		})
	})

	it('should represent records from different scopes', () => {
		const documentScopedRecords: TLRecord[] = [
			{
				id: 'shape:doc' as any,
				typeName: 'shape',
				type: 'geo',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				props: {
					geo: 'rectangle',
					w: 100,
					h: 100,
					color: 'blue',
					fill: 'none',
					dash: 'draw',
					size: 'm',
				},
				meta: {},
			},
			{
				id: 'page:doc' as any,
				typeName: 'page',
				name: 'Document Page',
				index: 'a1' as any,
				meta: {},
			},
			{
				id: 'asset:doc' as any,
				typeName: 'asset',
				type: 'video',
				props: {
					src: 'video.mp4',
					w: 640,
					h: 480,
					mimeType: 'video/mp4',
					name: 'demo',
					isAnimated: false,
				},
				meta: {},
			},
			{
				id: 'binding:doc' as any,
				typeName: 'binding',
				type: 'arrow',
				fromId: 'shape:1' as any,
				toId: 'shape:2' as any,
				props: {},
				meta: {},
			},
			{
				id: 'document:document' as any,
				typeName: 'document',
				gridSize: 20,
				name: 'My Document',
				meta: {},
			},
		]

		const sessionScopedRecords: TLRecord[] = [
			{
				id: 'camera:session' as any,
				typeName: 'camera',
				x: 100,
				y: 200,
				z: 1.5,
				meta: {},
			},
			{
				id: 'instance:instance' as any,
				typeName: 'instance',
				currentPageId: 'page:main' as any,
				opacityForNextShape: 0.8,
				stylesForNextShape: {},
				followingUserId: null,
				highlightedUserIds: [],
				brush: null,
				cursor: { type: 'pointer', rotation: 0 },
				scribbles: [],
				isFocusMode: true,
				isDebugMode: false,
				isToolLocked: false,
				exportBackground: true,
				screenBounds: { x: 0, y: 0, w: 1920, h: 1080 },
				insets: [false, false, false, false],
				zoomBrush: null,
				chatMessage: '',
				isChatting: false,
				isPenMode: false,
				isGridMode: true,
				isFocused: true,
				devicePixelRatio: 2,
				isCoarsePointer: false,
				isHoveringCanvas: true,
				openMenus: [],
				isChangingStyle: false,
				isReadonly: false,
				meta: {},
				duplicateProps: null,
			},
			{
				id: 'instance_page_state:session' as any,
				typeName: 'instance_page_state',
				pageId: 'page:main' as any,
				selectedShapeIds: ['shape:1' as any],
				hintingShapeIds: [],
				erasingShapeIds: [],
				hoveredShapeId: 'shape:2' as any,
				editingShapeId: null,
				croppingShapeId: null,
				focusedGroupId: null,
				meta: {},
			},
		]

		const presenceScopedRecords: TLRecord[] = [
			{
				id: 'instance_presence:user1' as any,
				typeName: 'instance_presence',
				userId: 'user1',
				userName: 'Alice',
				lastActivityTimestamp: Date.now(),
				color: '#FF6B6B',
				camera: { x: 0, y: 0, z: 1 },
				selectedShapeIds: ['shape:active' as any],
				currentPageId: 'page:collab' as any,
				brush: null,
				scribbles: [],
				screenBounds: { x: 0, y: 0, w: 1920, h: 1080 },
				followingUserId: null,
				cursor: { x: 150, y: 200, type: 'default', rotation: 0 },
				chatMessage: 'Working on this design',
				meta: {},
			},
			{
				id: 'pointer:pointer' as any,
				typeName: 'pointer',
				x: 300,
				y: 250,
				lastActivityTimestamp: Date.now(),
				meta: {},
			},
		]

		// All should be valid TLRecord types
		const allRecords: TLRecord[] = [
			...documentScopedRecords,
			...sessionScopedRecords,
			...presenceScopedRecords,
		]

		expect(allRecords).toHaveLength(10)

		// Check that we have records from all scopes
		const typeNames = new Set(allRecords.map((r) => r.typeName))
		expect(typeNames.has('shape')).toBe(true)
		expect(typeNames.has('page')).toBe(true)
		expect(typeNames.has('asset')).toBe(true)
		expect(typeNames.has('binding')).toBe(true)
		expect(typeNames.has('document')).toBe(true)
		expect(typeNames.has('camera')).toBe(true)
		expect(typeNames.has('instance')).toBe(true)
		expect(typeNames.has('instance_page_state')).toBe(true)
		expect(typeNames.has('instance_presence')).toBe(true)
		expect(typeNames.has('pointer')).toBe(true)
	})

	it('should maintain type safety with discriminated unions', () => {
		function processRecord(record: TLRecord) {
			// TypeScript should be able to narrow types based on typeName
			switch (record.typeName) {
				case 'shape':
					// TypeScript should know this is a TLShape
					return `Shape at (${record.x}, ${record.y})`
				case 'page':
					// TypeScript should know this is a TLPage
					return `Page: ${record.name}`
				case 'asset':
					// TypeScript should know this is a TLAsset
					return `Asset: ${record.type}`
				case 'binding':
					// TypeScript should know this is a TLBinding
					return `Binding from ${record.fromId} to ${record.toId}`
				case 'camera':
					// TypeScript should know this is a TLCamera
					return `Camera at (${record.x}, ${record.y}) zoom: ${record.z}`
				case 'document':
					// TypeScript should know this is a TLDocument
					return `Document: ${record.name}, grid: ${record.gridSize}`
				case 'instance':
					// TypeScript should know this is a TLInstance
					return `Instance on page ${record.currentPageId}`
				case 'instance_page_state':
					// TypeScript should know this is a TLInstancePageState
					return `Page state for ${record.pageId}, selected: ${record.selectedShapeIds.length}`
				case 'instance_presence':
					// TypeScript should know this is a TLInstancePresence
					return `Presence of ${record.userName} (${record.userId})`
				case 'pointer':
					// TypeScript should know this is a TLPointer
					return `Pointer at (${record.x}, ${record.y})`
				default:
					// This should never be reached if all cases are handled
					const _exhaustive: never = record
					return `Unknown record type`
			}
		}

		const testRecords: TLRecord[] = [
			{
				id: 'shape:test' as any,
				typeName: 'shape',
				type: 'geo',
				x: 50,
				y: 100,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				props: {
					geo: 'ellipse',
					w: 80,
					h: 80,
					color: 'green',
					fill: 'solid',
					dash: 'draw',
					size: 'm',
				},
				meta: {},
			},
			{
				id: 'page:test' as any,
				typeName: 'page',
				name: 'Test Page',
				index: 'a1' as any,
				meta: {},
			},
		]

		const descriptions = testRecords.map(processRecord)
		expect(descriptions[0]).toBe('Shape at (50, 100)')
		expect(descriptions[1]).toBe('Page: Test Page')
	})
})
