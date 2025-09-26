import { describe, expect, it } from 'vitest'
import {
	CameraRecordType,
	TLCameraId,
	cameraMigrations,
	cameraValidator,
	cameraVersions,
} from './TLCamera'

describe('cameraValidator', () => {
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

describe('cameraMigrations', () => {
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
})

describe('CameraRecordType', () => {
	it('should create camera records with defaults', () => {
		const camera = CameraRecordType.create({
			id: 'camera:test' as TLCameraId,
		})

		expect(camera.x).toBe(0)
		expect(camera.y).toBe(0)
		expect(camera.z).toBe(1)
		expect(camera.meta).toEqual({})
	})

	it('should create unique IDs', () => {
		const id1 = CameraRecordType.createId()
		const id2 = CameraRecordType.createId()
		expect(id1).not.toBe(id2)
		expect(id1.startsWith('camera:')).toBe(true)
		expect(id2.startsWith('camera:')).toBe(true)
	})
})
