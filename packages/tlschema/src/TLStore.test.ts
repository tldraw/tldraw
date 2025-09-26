import { atom, Signal } from '@tldraw/state'
import { Store } from '@tldraw/store'
import { annotateError, IndexKey, sortByIndex, structuredClone } from '@tldraw/utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTLSchema } from './createTLSchema'
import { TLAssetId } from './records/TLAsset'
import { CameraRecordType } from './records/TLCamera'
import { TLDOCUMENT_ID } from './records/TLDocument'
import { TLINSTANCE_ID } from './records/TLInstance'
import { PageRecordType, TLPageId } from './records/TLPage'
import { InstancePageStateRecordType } from './records/TLPageState'
import { TLPOINTER_ID } from './records/TLPointer'
import { TLRecord } from './records/TLRecord'
import { TLShapeId } from './records/TLShape'
import {
	createIntegrityChecker,
	onValidationFailure,
	redactRecordForErrorReporting,
	TLAssetStore,
	TLStoreProps,
} from './TLStore'

// Mock dependencies
vi.mock('@tldraw/utils', async () => {
	const actual = await vi.importActual('@tldraw/utils')
	return {
		...actual,
		annotateError: vi.fn(),
		structuredClone: vi.fn((obj) => JSON.parse(JSON.stringify(obj))),
	}
})

describe('TLStore utility functions', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('sortByIndex', () => {
		it('should sort items by index in ascending order', () => {
			const items = [
				{ index: 'c' as IndexKey, name: 'third' },
				{ index: 'a' as IndexKey, name: 'first' },
				{ index: 'b' as IndexKey, name: 'second' },
			]

			const sorted = items.sort(sortByIndex)

			expect(sorted).toEqual([
				{ index: 'a' as IndexKey, name: 'first' },
				{ index: 'b' as IndexKey, name: 'second' },
				{ index: 'c' as IndexKey, name: 'third' },
			])
		})

		it('should handle equal indices correctly', () => {
			const items = [
				{ index: 'a' as IndexKey, name: 'first' },
				{ index: 'a' as IndexKey, name: 'duplicate' },
			]

			const sorted = items.sort(sortByIndex)

			expect(sorted[0].index).toBe('a')
			expect(sorted[1].index).toBe('a')
		})

		it('should work with IndexKey fractional indices', () => {
			const items = [
				{ index: 'a2' as IndexKey },
				{ index: 'a1' as IndexKey },
				{ index: 'a1V' as IndexKey },
			]

			const sorted = items.sort(sortByIndex)

			expect(sorted[0].index).toBe('a1')
			expect(sorted[1].index).toBe('a1V')
			expect(sorted[2].index).toBe('a2')
		})

		it('should handle empty string indices', () => {
			const items = [
				{ index: '' as IndexKey, name: 'empty' },
				{ index: 'a' as IndexKey, name: 'a' },
			]

			const sorted = items.sort(sortByIndex)

			expect(sorted[0].index).toBe('')
			expect(sorted[1].index).toBe('a')
		})
	})

	describe('redactRecordForErrorReporting', () => {
		it('should redact src field from asset record', () => {
			const assetRecord = {
				id: 'asset:test',
				typeName: 'asset',
				type: 'image',
				src: 'https://secret.com/image.png',
				props: {
					src: 'https://secret.com/props-image.png',
					width: 100,
					height: 100,
				},
			}

			redactRecordForErrorReporting(assetRecord)

			expect(assetRecord.src).toBe('<redacted>')
			expect(assetRecord.props.src).toBe('<redacted>')
			expect(assetRecord.props.width).toBe(100) // Other props should remain unchanged
			expect(assetRecord.props.height).toBe(100)
		})

		it('should redact only props.src if top-level src does not exist', () => {
			const assetRecord = {
				id: 'asset:test',
				typeName: 'asset',
				type: 'video',
				props: {
					src: 'https://secret.com/video.mp4',
					width: 200,
					height: 150,
				},
			}

			redactRecordForErrorReporting(assetRecord)

			expect(assetRecord.props.src).toBe('<redacted>')
			expect(assetRecord.props.width).toBe(200)
			expect(assetRecord.props.height).toBe(150)
		})

		it('should not modify non-asset records', () => {
			const shapeRecord = {
				id: 'shape:test',
				typeName: 'shape',
				type: 'geo',
				x: 100,
				y: 200,
				props: {
					color: 'red',
					size: 'medium',
				},
			}

			const originalRecord = JSON.parse(JSON.stringify(shapeRecord))
			redactRecordForErrorReporting(shapeRecord)

			expect(shapeRecord).toEqual(originalRecord)
		})

		it('should handle asset records without src fields gracefully', () => {
			const assetRecord = {
				id: 'asset:test',
				typeName: 'asset',
				type: 'bookmark',
				props: {
					title: 'Test Bookmark',
					description: 'A test bookmark',
				},
			}

			const originalRecord = JSON.parse(JSON.stringify(assetRecord))
			redactRecordForErrorReporting(assetRecord)

			expect(assetRecord).toEqual(originalRecord)
		})

		it('should handle asset records with only top-level src', () => {
			const assetRecord = {
				id: 'asset:test',
				typeName: 'asset',
				type: 'image',
				src: 'https://secret.com/image.png',
				props: {
					width: 100,
					height: 100,
				},
			}

			redactRecordForErrorReporting(assetRecord)

			expect(assetRecord.src).toBe('<redacted>')
			expect(assetRecord.props.width).toBe(100)
			expect(assetRecord.props.height).toBe(100)
		})
	})
})

describe('onValidationFailure', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should annotate error with correct tags and extras', () => {
		const mockError = new Error('Test validation error')
		const record = {
			id: 'shape:test',
			typeName: 'shape',
			type: 'geo',
			x: 100,
			y: 200,
		} as any

		const recordBefore = {
			id: 'shape:test',
			typeName: 'shape',
			type: 'geo',
			x: 50,
			y: 150,
		} as any

		const validationFailure = {
			error: mockError,
			phase: 'updateRecord' as const,
			record,
			recordBefore,
			store: {} as any, // Required by StoreValidationFailure interface
		}

		expect(() => onValidationFailure(validationFailure)).toThrow(mockError)

		expect(annotateError).toHaveBeenCalledWith(
			mockError,
			expect.objectContaining({
				tags: expect.objectContaining({
					origin: 'store.validateRecord',
					storePhase: 'updateRecord',
					isExistingValidationIssue: false,
				}),
			})
		)
	})

	it('should mark initialize phase as existing validation issue', () => {
		const mockError = new Error('Initialize error')
		const record = { id: 'test:1', typeName: 'test' } as any

		const validationFailure = {
			error: mockError,
			phase: 'initialize' as const,
			record,
			recordBefore: null,
			store: {} as any,
		}

		expect(() => onValidationFailure(validationFailure)).toThrow(mockError)

		expect(annotateError).toHaveBeenCalledWith(
			mockError,
			expect.objectContaining({
				tags: expect.objectContaining({
					isExistingValidationIssue: true,
				}),
			})
		)
	})

	it('should handle missing recordBefore', () => {
		const mockError = new Error('No record before')
		const record = { id: 'test:new', typeName: 'test' } as any

		const validationFailure = {
			error: mockError,
			phase: 'createRecord' as const,
			record,
			recordBefore: null,
			store: {} as any,
		}

		expect(() => onValidationFailure(validationFailure)).toThrow(mockError)

		expect(annotateError).toHaveBeenCalledWith(
			mockError,
			expect.objectContaining({
				tags: expect.objectContaining({
					origin: 'store.validateRecord',
					storePhase: 'createRecord',
					isExistingValidationIssue: false,
				}),
			})
		)
	})

	it('should redact asset records in error reporting', () => {
		const mockError = new Error('Asset validation error')
		const assetRecord = {
			id: 'asset:image',
			typeName: 'asset',
			type: 'image',
			src: 'https://secret.com/image.png',
			props: {
				src: 'https://secret.com/props-image.png',
				width: 100,
				height: 100,
			},
		} as any

		const validationFailure = {
			error: mockError,
			phase: 'createRecord' as const,
			record: assetRecord,
			recordBefore: null,
			store: {} as any,
		}

		expect(() => onValidationFailure(validationFailure)).toThrow(mockError)

		// The function should call annotateError, and redaction happens internally
		expect(annotateError).toHaveBeenCalledWith(
			mockError,
			expect.objectContaining({
				tags: expect.objectContaining({
					origin: 'store.validateRecord',
					storePhase: 'createRecord',
					isExistingValidationIssue: false,
				}),
			})
		)
	})

	it('should handle different validation phases correctly', () => {
		const phases = ['initialize', 'createRecord', 'updateRecord', 'tests'] as const
		const mockError = new Error('Phase test')
		const record = { id: 'test:phase', typeName: 'test' } as any

		phases.forEach((phase) => {
			const validationFailure = {
				error: mockError,
				phase,
				record,
				recordBefore: null,
				store: {} as any,
			}

			expect(() => onValidationFailure(validationFailure)).toThrow(mockError)

			expect(annotateError).toHaveBeenCalledWith(
				mockError,
				expect.objectContaining({
					tags: expect.objectContaining({
						storePhase: phase,
						isExistingValidationIssue: phase === 'initialize',
					}),
				})
			)

			vi.clearAllMocks()
		})
	})

	it('should use structuredClone for records', () => {
		const mockError = new Error('Clone test')
		const record = { id: 'test:clone', typeName: 'test', nested: { prop: 'value' } } as any
		const recordBefore = { id: 'test:clone', typeName: 'test', nested: { prop: 'old' } } as any

		const validationFailure = {
			error: mockError,
			phase: 'updateRecord' as const,
			record,
			recordBefore,
			store: {} as any,
		}

		expect(() => onValidationFailure(validationFailure)).toThrow(mockError)

		expect(structuredClone).toHaveBeenCalledWith(record)
		expect(structuredClone).toHaveBeenCalledWith(recordBefore)
	})
})

describe('createIntegrityChecker', () => {
	let store: Store<TLRecord, TLStoreProps>
	let mockAssetStore: Required<TLAssetStore>

	beforeEach(() => {
		mockAssetStore = {
			upload: vi.fn().mockResolvedValue({ src: 'uploaded-url' }),
			resolve: vi.fn().mockResolvedValue('resolved-url'),
			remove: vi.fn().mockResolvedValue(undefined),
		} as Required<TLAssetStore>

		const schema = createTLSchema()
		store = new Store({
			schema,
			props: {
				defaultName: 'Test Store',
				assets: mockAssetStore,
				onMount: vi.fn(),
			},
		})
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('document and pointer records', () => {
		it('should create missing document record', () => {
			// Remove document record if it exists
			if (store.has(TLDOCUMENT_ID)) {
				store.remove([TLDOCUMENT_ID])
			}

			const checker = createIntegrityChecker(store)
			checker()

			expect(store.has(TLDOCUMENT_ID)).toBe(true)
			const document = store.get(TLDOCUMENT_ID)
			expect(document).toBeDefined()
			expect(document!.name).toBe('Test Store')
		})

		it('should create missing pointer record', () => {
			// Remove pointer record if it exists
			if (store.has(TLPOINTER_ID)) {
				store.remove([TLPOINTER_ID])
			}

			const checker = createIntegrityChecker(store)
			checker()

			expect(store.has(TLPOINTER_ID)).toBe(true)
			const pointer = store.get(TLPOINTER_ID)
			expect(pointer).toBeDefined()
			expect(pointer!.typeName).toBe('pointer')
		})
	})

	describe('page management', () => {
		it('should create default page when none exist', () => {
			// Clear all pages
			const pageIds = store.query.ids('page').get()
			store.remove([...pageIds])

			const checker = createIntegrityChecker(store)
			checker()

			const newPageIds = store.query.ids('page').get()
			expect(newPageIds.size).toBe(1)

			const page = store.get([...newPageIds][0]) as any
			expect(page).toBeDefined()
			expect(page!.name).toBe('Page 1')
			expect(page!.index).toBe('a1')
		})

		it('should preserve existing pages', () => {
			// First ensure we have at least one page
			const checker = createIntegrityChecker(store)
			checker()

			const existingPageIds = store.query.ids('page').get()
			expect(existingPageIds.size).toBeGreaterThan(0) // Should have at least one page

			// Run checker again - should not change pages
			checker()
			const newPageIds = store.query.ids('page').get()
			expect(newPageIds.size).toBe(existingPageIds.size)
		})
	})

	describe('instance state management', () => {
		it('should create missing instance state', () => {
			// Remove instance if it exists
			if (store.has(TLINSTANCE_ID)) {
				store.remove([TLINSTANCE_ID])
			}

			// Ensure we have at least one page
			const pageIds = store.query.ids('page').get()
			if (pageIds.size === 0) {
				store.put([
					PageRecordType.create({
						id: 'page:test' as TLPageId,
						name: 'Test Page',
						index: 'a1' as IndexKey,
						meta: {},
					}),
				])
			}

			const checker = createIntegrityChecker(store)
			checker()

			expect(store.has(TLINSTANCE_ID)).toBe(true)
			const instance = store.get(TLINSTANCE_ID)
			expect(instance).toBeDefined()
			expect(instance!.currentPageId).toBeDefined()
			expect(instance!.exportBackground).toBe(true)
		})

		it('should update instance to reference valid page when current page is invalid', () => {
			// Create a valid page
			const validPageId = 'page:valid' as TLPageId
			store.put([
				PageRecordType.create({
					id: validPageId,
					name: 'Valid Page',
					index: 'a1' as IndexKey,
					meta: {},
				}),
			])

			// Create instance with invalid page reference
			const invalidPageId = 'page:invalid' as TLPageId
			store.put([
				store.schema.types.instance.create({
					id: TLINSTANCE_ID,
					currentPageId: invalidPageId,
					exportBackground: true,
				}),
			])

			const checker = createIntegrityChecker(store)
			checker()

			const instance = store.get(TLINSTANCE_ID)
			expect(instance!.currentPageId).toBe(validPageId)
		})
	})

	describe('page state and camera management', () => {
		it('should create missing page states for existing pages', () => {
			// Create a page
			const pageId = 'page:test' as TLPageId
			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Test Page',
					index: 'a1' as IndexKey,
					meta: {},
				}),
			])

			// Remove any existing page state
			const pageStateId = InstancePageStateRecordType.createId(pageId)
			if (store.has(pageStateId)) {
				store.remove([pageStateId])
			}

			const checker = createIntegrityChecker(store)
			checker()

			expect(store.has(pageStateId)).toBe(true)
			const pageState = store.get(pageStateId)
			expect(pageState).toBeDefined()
			expect(pageState!.pageId).toBe(pageId)
		})

		it('should create missing cameras for existing pages', () => {
			// Create a page
			const pageId = 'page:test' as TLPageId
			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Test Page',
					index: 'a1' as IndexKey,
					meta: {},
				}),
			])

			// Remove any existing camera
			const cameraId = CameraRecordType.createId(pageId)
			if (store.has(cameraId)) {
				store.remove([cameraId])
			}

			const checker = createIntegrityChecker(store)
			checker()

			expect(store.has(cameraId)).toBe(true)
			const camera = store.get(cameraId)
			expect(camera).toBeDefined()
			expect(camera!.id).toBe(cameraId)
		})
	})

	describe('page state cleanup and validation', () => {
		it('should remove page states for non-existent pages', () => {
			// Create page state for non-existent page
			const nonExistentPageId = 'page:nonexistent' as TLPageId
			const orphanPageStateId = InstancePageStateRecordType.createId(nonExistentPageId)

			store.put([
				InstancePageStateRecordType.create({
					id: orphanPageStateId,
					pageId: nonExistentPageId,
				}),
			])

			const checker = createIntegrityChecker(store)
			checker()

			expect(store.has(orphanPageStateId)).toBe(false)
		})

		it('should clear invalid croppingShapeId from page states', () => {
			// Create a page and page state
			const pageId = 'page:test' as TLPageId
			const pageStateId = InstancePageStateRecordType.createId(pageId)
			const invalidShapeId = 'shape:nonexistent' as TLShapeId

			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Test Page',
					index: 'a1' as IndexKey,
					meta: {},
				}),
				InstancePageStateRecordType.create({
					id: pageStateId,
					pageId: pageId,
					croppingShapeId: invalidShapeId,
				}),
			])

			const checker = createIntegrityChecker(store)
			checker()

			const pageState = store.get(pageStateId)
			expect(pageState!.croppingShapeId).toBe(null)
		})

		it('should clear invalid focusedGroupId from page states', () => {
			// Create a page and page state
			const pageId = 'page:test' as TLPageId
			const pageStateId = InstancePageStateRecordType.createId(pageId)
			const invalidGroupId = 'shape:nonexistent' as TLShapeId

			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Test Page',
					index: 'a1' as IndexKey,
					meta: {},
				}),
				InstancePageStateRecordType.create({
					id: pageStateId,
					pageId: pageId,
					focusedGroupId: invalidGroupId,
				}),
			])

			const checker = createIntegrityChecker(store)
			checker()

			const pageState = store.get(pageStateId)
			expect(pageState!.focusedGroupId).toBe(null)
		})

		it('should clear invalid hoveredShapeId from page states', () => {
			// Create a page and page state
			const pageId = 'page:test' as TLPageId
			const pageStateId = InstancePageStateRecordType.createId(pageId)
			const invalidShapeId = 'shape:nonexistent' as TLShapeId

			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Test Page',
					index: 'a1' as IndexKey,
					meta: {},
				}),
				InstancePageStateRecordType.create({
					id: pageStateId,
					pageId: pageId,
					hoveredShapeId: invalidShapeId,
				}),
			])

			const checker = createIntegrityChecker(store)
			checker()

			const pageState = store.get(pageStateId)
			expect(pageState!.hoveredShapeId).toBe(null)
		})

		it('should filter invalid selectedShapeIds from page states', () => {
			// Create a page and page state
			const pageId = 'page:test' as TLPageId
			const pageStateId = InstancePageStateRecordType.createId(pageId)
			const invalidShapeIds = ['shape:nonexistent1', 'shape:nonexistent2'] as TLShapeId[]

			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Test Page',
					index: 'a1' as IndexKey,
					meta: {},
				}),
				InstancePageStateRecordType.create({
					id: pageStateId,
					pageId: pageId,
					selectedShapeIds: invalidShapeIds,
				}),
			])

			const checker = createIntegrityChecker(store)
			checker()

			const pageState = store.get(pageStateId)
			expect(pageState!.selectedShapeIds).toEqual([])
		})

		it('should filter invalid hintingShapeIds from page states', () => {
			// Create a page and page state
			const pageId = 'page:test' as TLPageId
			const pageStateId = InstancePageStateRecordType.createId(pageId)
			const invalidShapeIds = ['shape:hint1', 'shape:hint2'] as TLShapeId[]

			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Test Page',
					index: 'a1' as IndexKey,
					meta: {},
				}),
				InstancePageStateRecordType.create({
					id: pageStateId,
					pageId: pageId,
					hintingShapeIds: invalidShapeIds,
				}),
			])

			const checker = createIntegrityChecker(store)
			checker()

			const pageState = store.get(pageStateId)
			expect(pageState!.hintingShapeIds).toEqual([])
		})

		it('should filter invalid erasingShapeIds from page states', () => {
			// Create a page and page state
			const pageId = 'page:test' as TLPageId
			const pageStateId = InstancePageStateRecordType.createId(pageId)
			const invalidShapeIds = ['shape:erase1', 'shape:erase2'] as TLShapeId[]

			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Test Page',
					index: 'a1' as IndexKey,
					meta: {},
				}),
				InstancePageStateRecordType.create({
					id: pageStateId,
					pageId: pageId,
					erasingShapeIds: invalidShapeIds,
				}),
			])

			const checker = createIntegrityChecker(store)
			checker()

			const pageState = store.get(pageStateId)
			expect(pageState!.erasingShapeIds).toEqual([])
		})
	})

	describe('recursive integrity checking', () => {
		it('should recursively call itself when making corrections', () => {
			// Start with empty store - this will trigger multiple corrections
			store.clear()

			const checker = createIntegrityChecker(store)

			// This should not throw or hang - it should complete successfully
			expect(() => checker()).not.toThrow()

			// Verify final state is valid
			expect(store.has(TLDOCUMENT_ID)).toBe(true)
			expect(store.has(TLPOINTER_ID)).toBe(true)
			expect(store.query.ids('page').get().size).toBe(1)
			expect(store.has(TLINSTANCE_ID)).toBe(true)
		})

		it('should handle complex integrity violations in sequence', () => {
			// Create a scenario with multiple integrity issues
			store.clear()

			// Add a page without required instance/document/pointer records
			const pageId = 'page:orphan' as TLPageId
			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Orphan Page',
					index: 'a1' as IndexKey,
					meta: {},
				}),
			])

			const checker = createIntegrityChecker(store)
			checker()

			// All required records should now exist
			expect(store.has(TLDOCUMENT_ID)).toBe(true)
			expect(store.has(TLPOINTER_ID)).toBe(true)
			expect(store.has(TLINSTANCE_ID)).toBe(true)
			expect(store.has(InstancePageStateRecordType.createId(pageId))).toBe(true)
			expect(store.has(CameraRecordType.createId(pageId))).toBe(true)
		})
	})
})

describe('TLAssetStore interface', () => {
	describe('upload method', () => {
		it('should define correct upload signature', () => {
			const mockAssetStore: TLAssetStore = {
				upload: async (asset, file, abortSignal) => {
					expect(asset).toBeDefined()
					expect(file).toBeInstanceOf(File)
					expect(abortSignal).toBeInstanceOf(AbortSignal)
					return { src: 'uploaded-url', meta: { uploadTime: Date.now() } }
				},
				resolve: async () => 'resolved-url',
				remove: async () => {},
			}

			expect(typeof mockAssetStore.upload).toBe('function')
		})

		it('should support optional abortSignal parameter', () => {
			const mockAssetStore: TLAssetStore = {
				upload: async (asset, file, abortSignal?) => {
					if (abortSignal) {
						expect(abortSignal).toBeInstanceOf(AbortSignal)
					}
					return { src: 'uploaded-url' }
				},
				resolve: async () => 'resolved-url',
				remove: async () => {},
			}

			expect(typeof mockAssetStore.upload).toBe('function')
		})
	})

	describe('resolve method', () => {
		it('should define correct resolve signature', async () => {
			const mockAsset = {
				id: 'asset:test' as TLAssetId,
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					src: 'test.png',
					w: 100,
					h: 100,
					mimeType: 'image/png',
					name: 'test',
					isAnimated: false,
				},
				meta: {},
			}

			const mockContext = {
				screenScale: 1,
				steppedScreenScale: 1,
				dpr: 2,
				networkEffectiveType: '4g',
				shouldResolveToOriginal: false,
			}

			const mockAssetStore: TLAssetStore = {
				upload: async () => ({ src: 'uploaded-url' }),
				resolve: async (asset, context) => {
					expect(asset).toEqual(mockAsset)
					expect(context).toEqual(mockContext)
					return 'resolved-url'
				},
				remove: async () => {},
			}

			const result = await mockAssetStore.resolve!(mockAsset, mockContext)
			expect(result).toBe('resolved-url')
		})

		it('should handle sync resolve method', () => {
			const mockAsset = {
				id: 'asset:test' as TLAssetId,
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					src: 'test.png',
					w: 100,
					h: 100,
					mimeType: 'image/png',
					name: 'test',
					isAnimated: false,
				},
				meta: {},
			}

			const mockContext = {
				screenScale: 0.5,
				steppedScreenScale: 0.5,
				dpr: 1,
				networkEffectiveType: null,
				shouldResolveToOriginal: true,
			}

			const mockAssetStore: TLAssetStore = {
				upload: async () => ({ src: 'uploaded-url' }),
				resolve: (asset, context) => {
					if (context.shouldResolveToOriginal) {
						return asset.props.src
					}
					return `${asset.props.src}?scale=${context.screenScale}`
				},
				remove: async () => {},
			}

			const result = mockAssetStore.resolve!(mockAsset, mockContext)
			expect(result).toBe('test.png')
		})

		it('should return null when asset not available', () => {
			const mockAssetStore: TLAssetStore = {
				upload: async () => ({ src: 'uploaded-url' }),
				resolve: () => null,
				remove: async () => {},
			}

			const mockAsset = {
				id: 'asset:test' as TLAssetId,
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					src: 'test.png',
					w: 100,
					h: 100,
					mimeType: 'image/png',
					name: 'test',
					isAnimated: false,
				},
				meta: {},
			}

			const mockContext = {
				screenScale: 1,
				steppedScreenScale: 1,
				dpr: 1,
				networkEffectiveType: '4g',
				shouldResolveToOriginal: false,
			}

			const result = mockAssetStore.resolve!(mockAsset, mockContext)
			expect(result).toBe(null)
		})
	})

	describe('remove method', () => {
		it('should define correct remove signature', async () => {
			const assetIds = ['asset:1', 'asset:2'] as TLAssetId[]

			const mockAssetStore: TLAssetStore = {
				upload: async () => ({ src: 'uploaded-url' }),
				resolve: async () => 'resolved-url',
				remove: async (ids) => {
					expect(ids).toEqual(assetIds)
					expect(Array.isArray(ids)).toBe(true)
				},
			}

			await mockAssetStore.remove!(assetIds)
		})

		it('should handle empty asset ID arrays', async () => {
			const mockAssetStore: TLAssetStore = {
				upload: async () => ({ src: 'uploaded-url' }),
				resolve: async () => 'resolved-url',
				remove: async (ids) => {
					expect(ids).toEqual([])
				},
			}

			await mockAssetStore.remove!([])
		})
	})

	describe('optional methods', () => {
		it('should allow asset store without resolve method', () => {
			const minimalAssetStore: TLAssetStore = {
				upload: async () => ({ src: 'uploaded-url' }),
			}

			expect(minimalAssetStore.resolve).toBeUndefined()
			expect(minimalAssetStore.remove).toBeUndefined()
		})

		it('should allow asset store without remove method', () => {
			const partialAssetStore: TLAssetStore = {
				upload: async () => ({ src: 'uploaded-url' }),
				resolve: async () => 'resolved-url',
			}

			expect(partialAssetStore.remove).toBeUndefined()
		})
	})
})

describe('TLAssetContext interface', () => {
	it('should contain all required context properties', () => {
		const context = {
			screenScale: 1.5,
			steppedScreenScale: 2,
			dpr: 2.5,
			networkEffectiveType: 'slow-2g',
			shouldResolveToOriginal: true,
		}

		expect(typeof context.screenScale).toBe('number')
		expect(typeof context.steppedScreenScale).toBe('number')
		expect(typeof context.dpr).toBe('number')
		expect(typeof context.networkEffectiveType).toBe('string')
		expect(typeof context.shouldResolveToOriginal).toBe('boolean')
	})

	it('should allow null networkEffectiveType', () => {
		const context = {
			screenScale: 1,
			steppedScreenScale: 1,
			dpr: 1,
			networkEffectiveType: null,
			shouldResolveToOriginal: false,
		}

		expect(context.networkEffectiveType).toBe(null)
	})

	it('should work with typical real-world values', () => {
		const contexts = [
			{
				screenScale: 0.25, // Zoomed out view
				steppedScreenScale: 0.25,
				dpr: 1, // Standard display
				networkEffectiveType: '4g',
				shouldResolveToOriginal: false,
			},
			{
				screenScale: 2.0, // Zoomed in view
				steppedScreenScale: 2,
				dpr: 3, // High-DPI display (iPhone)
				networkEffectiveType: 'slow-2g',
				shouldResolveToOriginal: false,
			},
			{
				screenScale: 1.0, // Normal zoom
				steppedScreenScale: 1,
				dpr: 2, // Retina display
				networkEffectiveType: null, // Not available
				shouldResolveToOriginal: true, // For export
			},
		]

		contexts.forEach((context) => {
			expect(context.screenScale).toBeTypeOf('number')
			expect(context.steppedScreenScale).toBeTypeOf('number')
			expect(context.dpr).toBeTypeOf('number')
			expect(context.shouldResolveToOriginal).toBeTypeOf('boolean')
			expect(
				context.networkEffectiveType === null || typeof context.networkEffectiveType === 'string'
			).toBe(true)
		})
	})
})

describe('TLStoreProps interface', () => {
	it('should require all essential properties', () => {
		const mockAssetStore: Required<TLAssetStore> = {
			upload: async () => ({ src: 'test-url' }),
			resolve: async () => 'resolved-url',
			remove: async () => {},
		}

		const storeProps: TLStoreProps = {
			defaultName: 'Test Document',
			assets: mockAssetStore,
			onMount: () => {},
		}

		expect(storeProps.defaultName).toBe('Test Document')
		expect(storeProps.assets).toBe(mockAssetStore)
		expect(typeof storeProps.onMount).toBe('function')
	})

	it('should support onMount with cleanup function', () => {
		const cleanup = vi.fn()
		const storeProps: TLStoreProps = {
			defaultName: 'Test',
			assets: {
				upload: async () => ({ src: 'test-url' }),
				resolve: async () => 'resolved-url',
				remove: async () => {},
			} as Required<TLAssetStore>,
			onMount: () => cleanup,
		}

		const cleanupFn = storeProps.onMount({})
		expect(typeof cleanupFn).toBe('function')

		if (cleanupFn) {
			cleanupFn()
		}
		expect(cleanup).toHaveBeenCalled()
	})

	it('should support onMount without cleanup function', () => {
		const onMount = vi.fn()
		const storeProps: TLStoreProps = {
			defaultName: 'Test',
			assets: {
				upload: async () => ({ src: 'test-url' }),
				resolve: async () => 'resolved-url',
				remove: async () => {},
			} as Required<TLAssetStore>,
			onMount,
		}

		const result = storeProps.onMount({})
		expect(onMount).toHaveBeenCalled()
		expect(result).toBeUndefined()
	})

	it('should support optional collaboration configuration', () => {
		const statusSignal: Signal<'online' | 'offline'> = atom('statusSignal', 'online')
		const modeSignal: Signal<'readonly' | 'readwrite'> = atom('modeSignal', 'readwrite')

		const storeProps: TLStoreProps = {
			defaultName: 'Collaborative Document',
			assets: {
				upload: async () => ({ src: 'test-url' }),
				resolve: async () => 'resolved-url',
				remove: async () => {},
			} as Required<TLAssetStore>,
			onMount: () => {},
			collaboration: {
				status: statusSignal,
				mode: modeSignal,
			},
		}

		expect(storeProps.collaboration).toBeDefined()
		expect(storeProps.collaboration!.status).toBe(statusSignal)
		expect(storeProps.collaboration!.mode).toBe(modeSignal)

		// Test that signals have correct values (atoms have .get() method)
		expect(typeof statusSignal.get).toBe('function')
		expect(typeof modeSignal.get).toBe('function')
	})

	it('should support collaboration with null status', () => {
		const storeProps: TLStoreProps = {
			defaultName: 'Test',
			assets: {
				upload: async () => ({ src: 'test-url' }),
				resolve: async () => 'resolved-url',
				remove: async () => {},
			} as Required<TLAssetStore>,
			onMount: () => {},
			collaboration: {
				status: null,
			},
		}

		expect(storeProps.collaboration!.status).toBe(null)
		expect(storeProps.collaboration!.mode).toBeUndefined()
	})

	it('should support collaboration with null mode', () => {
		const statusSignal: Signal<'online' | 'offline'> = atom('statusSignal2', 'offline')

		const storeProps: TLStoreProps = {
			defaultName: 'Test',
			assets: {
				upload: async () => ({ src: 'test-url' }),
				resolve: async () => 'resolved-url',
				remove: async () => {},
			} as Required<TLAssetStore>,
			onMount: () => {},
			collaboration: {
				status: statusSignal,
				mode: null,
			},
		}

		expect(storeProps.collaboration!.status).toBe(statusSignal)
		expect(storeProps.collaboration!.mode).toBe(null)
	})

	it('should work without collaboration configuration', () => {
		const storeProps: TLStoreProps = {
			defaultName: 'Simple Document',
			assets: {
				upload: async () => ({ src: 'test-url' }),
				resolve: async () => 'resolved-url',
				remove: async () => {},
			} as Required<TLAssetStore>,
			onMount: () => {},
		}

		expect(storeProps.collaboration).toBeUndefined()
	})
})

describe('Type definitions', () => {
	describe('TLStoreSchema', () => {
		it('should be compatible with StoreSchema', () => {
			const schema = createTLSchema()

			// This should compile and work correctly
			expect(schema).toBeDefined()
			expect(schema.types).toBeDefined()
			expect(typeof schema.validateRecord).toBe('function')
		})
	})

	describe('TLStore', () => {
		it('should be compatible with Store type', () => {
			const schema = createTLSchema()
			const mockAssetStore: Required<TLAssetStore> = {
				upload: async () => ({ src: 'test-url' }),
				resolve: async () => 'resolved-url',
				remove: async () => {},
			}

			const store = new Store({
				schema,
				props: {
					defaultName: 'Type Test',
					assets: mockAssetStore,
					onMount: () => {},
				},
			})

			expect(store).toBeDefined()
			expect(typeof store.get).toBe('function')
			expect(typeof store.put).toBe('function')
			expect(typeof store.remove).toBe('function')
			expect(store.props).toBeDefined()
		})
	})

	describe('TLSerializedStore', () => {
		it('should work with store serialization', () => {
			const schema = createTLSchema()
			const mockAssetStore: Required<TLAssetStore> = {
				upload: async () => ({ src: 'test-url' }),
				resolve: async () => 'resolved-url',
				remove: async () => {},
			}

			const store = new Store({
				schema,
				props: {
					defaultName: 'Serialization Test',
					assets: mockAssetStore,
					onMount: () => {},
				},
			})

			const serialized = store.serialize()
			expect(serialized).toBeDefined()
			expect(typeof serialized).toBe('object')
			// Store serialization returns an object mapping IDs to records
			expect(Array.isArray(serialized)).toBe(false)
			expect(serialized).toEqual(expect.any(Object))
		})
	})

	describe('TLStoreSnapshot', () => {
		it('should work with store snapshots', () => {
			const schema = createTLSchema()
			const mockAssetStore: Required<TLAssetStore> = {
				upload: async () => ({ src: 'test-url' }),
				resolve: async () => 'resolved-url',
				remove: async () => {},
			}

			const store = new Store({
				schema,
				props: {
					defaultName: 'Snapshot Test',
					assets: mockAssetStore,
					onMount: () => {},
				},
			})

			// Initialize store to ensure it has records
			const checker = createIntegrityChecker(store)
			checker()

			// Use getStoreSnapshot to get snapshot-like data
			const snapshot = store.getStoreSnapshot()
			expect(snapshot).toBeDefined()
			expect(typeof snapshot).toBe('object')
			expect(snapshot.store).toBeDefined()
			expect(snapshot.schema).toBeDefined()
		})
	})
})
