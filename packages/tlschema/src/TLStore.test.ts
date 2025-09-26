import { Store } from '@tldraw/store'
import { annotateError, IndexKey, structuredClone } from '@tldraw/utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTLSchema } from './createTLSchema'
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

		it.each([
			['croppingShapeId', 'shape:nonexistent' as TLShapeId, null],
			['focusedGroupId', 'shape:nonexistent' as TLShapeId, null],
			['hoveredShapeId', 'shape:nonexistent' as TLShapeId, null],
		])('should clear invalid %s from page states', (fieldName, invalidValue, expectedValue) => {
			const pageId = 'page:test' as TLPageId
			const pageStateId = InstancePageStateRecordType.createId(pageId)

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
					[fieldName]: invalidValue,
				}),
			])

			const checker = createIntegrityChecker(store)
			checker()

			const pageState = store.get(pageStateId)
			expect(pageState![fieldName as keyof typeof pageState]).toBe(expectedValue)
		})

		it.each([
			['selectedShapeIds', ['shape:nonexistent1', 'shape:nonexistent2'] as TLShapeId[]],
			['hintingShapeIds', ['shape:hint1', 'shape:hint2'] as TLShapeId[]],
			['erasingShapeIds', ['shape:erase1', 'shape:erase2'] as TLShapeId[]],
		])('should filter invalid %s from page states', (fieldName, invalidShapeIds) => {
			const pageId = 'page:test' as TLPageId
			const pageStateId = InstancePageStateRecordType.createId(pageId)

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
					[fieldName]: invalidShapeIds,
				}),
			])

			const checker = createIntegrityChecker(store)
			checker()

			const pageState = store.get(pageStateId)
			expect(pageState![fieldName as keyof typeof pageState]).toEqual([])
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
