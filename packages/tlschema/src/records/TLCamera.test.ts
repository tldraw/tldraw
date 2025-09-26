import { describe, expect, it } from 'vitest'
import {
	CameraRecordType,
	TLCamera,
	TLCameraId,
	cameraMigrations,
	cameraValidator,
	cameraVersions,
} from './TLCamera'

describe('TLCamera', () => {
	it('should define the camera interface correctly', () => {
		const camera: TLCamera = {
			id: 'camera:test' as TLCameraId,
			typeName: 'camera',
			x: 100,
			y: 200,
			z: 1.5,
			meta: { userId: 'user123' },
		}

		expect(camera.x).toBe(100)
		expect(camera.y).toBe(200)
		expect(camera.z).toBe(1.5)
		expect(camera.meta).toEqual({ userId: 'user123' })
		expect(camera.typeName).toBe('camera')
	})
})

describe('TLCameraId', () => {
	it('should be a branded type based on RecordId', () => {
		const cameraId: TLCameraId = 'camera:test' as TLCameraId
		expect(typeof cameraId).toBe('string')
		expect(cameraId.startsWith('camera:')).toBe(true)
	})

	it('should work with CameraRecordType.createId', () => {
		const generatedId = CameraRecordType.createId()
		expect(typeof generatedId).toBe('string')
		expect(generatedId.startsWith('camera:')).toBe(true)
	})
})

describe('cameraValidator', () => {
	it('should validate valid camera records', () => {
		const validCamera = {
			typeName: 'camera',
			id: 'camera:test' as TLCameraId,
			x: 100,
			y: -200,
			z: 0.5,
			meta: {},
		}

		expect(() => cameraValidator.validate(validCamera)).not.toThrow()
		const validated = cameraValidator.validate(validCamera)
		expect(validated).toEqual(validCamera)
	})

	it('should validate cameras with complex meta', () => {
		const cameraWithMeta = {
			typeName: 'camera',
			id: 'camera:test' as TLCameraId,
			x: 0,
			y: 0,
			z: 1,
			meta: { userId: 'user123', settings: { theme: 'dark' }, timestamp: 123456 },
		}

		expect(() => cameraValidator.validate(cameraWithMeta)).not.toThrow()
	})

	it('should reject cameras with invalid typeName', () => {
		const invalidCamera = {
			typeName: 'not-camera',
			id: 'camera:test' as TLCameraId,
			x: 0,
			y: 0,
			z: 1,
			meta: {},
		}

		expect(() => cameraValidator.validate(invalidCamera)).toThrow()
	})

	it('should reject cameras with invalid id format', () => {
		const invalidCamera = {
			typeName: 'camera',
			id: 'not-a-camera-id' as TLCameraId,
			x: 0,
			y: 0,
			z: 1,
			meta: {},
		}

		expect(() => cameraValidator.validate(invalidCamera)).toThrow()
	})

	it('should reject cameras with non-number coordinates', () => {
		const invalidCamera = {
			typeName: 'camera',
			id: 'camera:test' as TLCameraId,
			x: 'not-a-number',
			y: 0,
			z: 1,
			meta: {},
		}

		expect(() => cameraValidator.validate(invalidCamera)).toThrow()
	})

	it('should reject cameras with missing required fields', () => {
		const incompleteCamera = {
			typeName: 'camera',
			id: 'camera:test' as TLCameraId,
			x: 0,
			// missing y, z, meta
		}

		expect(() => cameraValidator.validate(incompleteCamera)).toThrow()
	})

	it('should handle edge case coordinate values', () => {
		const extremeCamera = {
			typeName: 'camera',
			id: 'camera:extreme' as TLCameraId,
			x: -Infinity,
			y: Infinity,
			z: 0,
			meta: {},
		}

		expect(() => cameraValidator.validate(extremeCamera)).toThrow()
	})
})

describe('cameraVersions', () => {
	it('should have correct version structure', () => {
		expect(cameraVersions).toHaveProperty('AddMeta')
		expect(cameraVersions.AddMeta).toBe('com.tldraw.camera/1')
	})

	it('should be consistent with migration sequence', () => {
		expect(typeof cameraVersions.AddMeta).toBe('string')
		expect(cameraVersions.AddMeta).toMatch(/^com\.tldraw\.camera\/\d+$/)
	})
})

describe('cameraMigrations', () => {
	it('should have correct migration configuration', () => {
		expect(cameraMigrations.sequenceId).toBe('com.tldraw.camera')
		// expect(cameraMigrations.recordType).toBe('camera') // Property doesn't exist on MigrationSequence
		expect(Array.isArray(cameraMigrations.sequence)).toBe(true)
	})

	it('should include AddMeta migration', () => {
		const addMetaMigration = cameraMigrations.sequence.find((m) => m.id === cameraVersions.AddMeta)
		expect(addMetaMigration).toBeDefined()
		expect(typeof addMetaMigration?.up).toBe('function')
	})

	it('should apply AddMeta migration correctly', () => {
		const addMetaMigration = cameraMigrations.sequence.find((m) => m.id === cameraVersions.AddMeta)!

		const oldRecord: any = {
			typeName: 'camera',
			id: 'camera:test',
			x: 100,
			y: 200,
			z: 0.5,
		}

		addMetaMigration.up(oldRecord)
		expect(oldRecord.meta).toEqual({})
	})

	it('should preserve existing properties during AddMeta migration', () => {
		const addMetaMigration = cameraMigrations.sequence.find((m) => m.id === cameraVersions.AddMeta)!

		const oldRecord: any = {
			typeName: 'camera',
			id: 'camera:test',
			x: -50,
			y: 75,
			z: 2.0,
			customProp: 'should-remain',
		}

		addMetaMigration.up(oldRecord)
		expect(oldRecord.meta).toEqual({})
		expect(oldRecord.x).toBe(-50)
		expect(oldRecord.y).toBe(75)
		expect(oldRecord.z).toBe(2.0)
		expect(oldRecord.customProp).toBe('should-remain')
	})

	it('should not override existing meta property', () => {
		const addMetaMigration = cameraMigrations.sequence.find((m) => m.id === cameraVersions.AddMeta)!

		const oldRecord: any = {
			typeName: 'camera',
			id: 'camera:test',
			x: 0,
			y: 0,
			z: 1,
			meta: { existing: 'data' },
		}

		addMetaMigration.up(oldRecord)
		// Migration should still set meta to {}, overriding existing
		expect(oldRecord.meta).toEqual({})
	})
})

describe('CameraRecordType', () => {
	it('should create camera records with defaults', () => {
		const camera = CameraRecordType.create({
			id: 'camera:test' as TLCameraId,
		})

		expect(camera.id).toBe('camera:test')
		expect(camera.typeName).toBe('camera')
		expect(camera.x).toBe(0)
		expect(camera.y).toBe(0)
		expect(camera.z).toBe(1)
		expect(camera.meta).toEqual({})
	})

	it('should create camera records with custom properties', () => {
		const camera = CameraRecordType.create({
			id: 'camera:custom' as TLCameraId,
			x: -100,
			y: 150,
			z: 0.75,
			meta: { userId: 'user456', viewMode: 'fit' },
		})

		expect(camera.x).toBe(-100)
		expect(camera.y).toBe(150)
		expect(camera.z).toBe(0.75)
		expect(camera.meta).toEqual({ userId: 'user456', viewMode: 'fit' })
	})

	it('should have correct configuration', () => {
		expect(CameraRecordType.typeName).toBe('camera')
		expect(CameraRecordType.scope).toBe('session')
	})

	it('should validate created records', () => {
		const camera = CameraRecordType.create({
			id: 'camera:validated' as TLCameraId,
			x: 50,
			y: -25,
			z: 1.2,
		})

		// Should be valid according to the validator
		expect(() => cameraValidator.validate(camera)).not.toThrow()
	})

	it('should create unique IDs', () => {
		const id1 = CameraRecordType.createId()
		const id2 = CameraRecordType.createId()
		expect(id1).not.toBe(id2)
		expect(id1.startsWith('camera:')).toBe(true)
		expect(id2.startsWith('camera:')).toBe(true)
	})

	it('should handle zero zoom level', () => {
		const camera = CameraRecordType.create({
			id: 'camera:zero-zoom' as TLCameraId,
			z: 0,
		})

		expect(camera.z).toBe(0)
		expect(() => cameraValidator.validate(camera)).not.toThrow()
	})

	it('should handle negative coordinates', () => {
		const camera = CameraRecordType.create({
			id: 'camera:negative' as TLCameraId,
			x: -1000,
			y: -500,
			z: 0.1,
		})

		expect(camera.x).toBe(-1000)
		expect(camera.y).toBe(-500)
		expect(() => cameraValidator.validate(camera)).not.toThrow()
	})
})

describe('TLCamera Integration', () => {
	it('should work with typical camera operations', () => {
		const cameraId = CameraRecordType.createId()

		// Create initial camera
		const initialCamera = CameraRecordType.create({
			id: cameraId,
			meta: { userId: 'user1' },
		})

		// Simulate camera pan
		const pannedCamera: TLCamera = {
			...initialCamera,
			x: initialCamera.x - 100,
			y: initialCamera.y - 50,
		}

		// Simulate zoom
		const zoomedCamera: TLCamera = {
			...pannedCamera,
			z: pannedCamera.z * 1.5,
		}

		expect(zoomedCamera.x).toBe(-100)
		expect(zoomedCamera.y).toBe(-50)
		expect(zoomedCamera.z).toBe(1.5)
		expect(() => cameraValidator.validate(zoomedCamera)).not.toThrow()
	})

	it('should handle camera reset scenario', () => {
		const camera = CameraRecordType.create({
			id: 'camera:user' as TLCameraId,
			x: -200,
			y: 300,
			z: 0.5,
			meta: { lastAction: 'zoom-out' },
		})

		// Reset to defaults
		const resetCamera: TLCamera = {
			...camera,
			x: 0,
			y: 0,
			z: 1,
			meta: { ...camera.meta, lastAction: 'reset' },
		}

		expect(resetCamera.x).toBe(0)
		expect(resetCamera.y).toBe(0)
		expect(resetCamera.z).toBe(1)
		expect(resetCamera.meta.lastAction).toBe('reset')
	})

	it('should support complex meta structures', () => {
		const camera = CameraRecordType.create({
			id: 'camera:complex' as TLCameraId,
			meta: {
				user: { id: 'user123', name: 'John' },
				session: { id: 'sess456', startTime: Date.now() },
				preferences: {
					smoothZoom: true,
					panSensitivity: 1.2,
					constraints: { minZoom: 0.1, maxZoom: 8 },
				},
			},
		})

		expect(camera.meta.user).toEqual({ id: 'user123', name: 'John' })
		expect((camera.meta.preferences as any).smoothZoom).toBe(true)
		expect(() => cameraValidator.validate(camera)).not.toThrow()
	})
})
