import { describe, expect, it } from 'vitest'
import { cameraMigrations, cameraVersions } from './TLCamera'

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
