import { describe, expect, it } from 'vitest'
import { TLRecord } from './TLRecord'

describe('TLRecord', () => {
	it('should support type discrimination by typeName', () => {
		function processRecord(record: TLRecord): string {
			// TypeScript should be able to narrow types based on typeName
			switch (record.typeName) {
				case 'shape':
					return `Shape at (${record.x}, ${record.y})`
				case 'page':
					return `Page: ${record.name}`
				case 'asset':
					return `Asset: ${record.type}`
				case 'binding':
					return `Binding from ${record.fromId} to ${record.toId}`
				case 'camera':
					return `Camera at (${record.x}, ${record.y}) zoom: ${record.z}`
				case 'document':
					return `Document: ${record.name}, grid: ${record.gridSize}`
				case 'instance':
					return `Instance on page ${record.currentPageId}`
				case 'instance_page_state':
					return `Page state for ${record.pageId}`
				case 'instance_presence':
					return `Presence of ${record.userName}`
				case 'pointer':
					return `Pointer at (${record.x}, ${record.y})`
				default:
					// This should never be reached if all cases are handled
					return 'Unknown record type'
			}
		}

		// Test that the discriminated union works correctly
		const shapeRecord: TLRecord = {
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
				geo: 'rectangle',
				w: 80,
				h: 80,
				color: 'black',
				fill: 'none',
				dash: 'draw',
				size: 'm',
			},
			meta: {},
		}

		const pageRecord: TLRecord = {
			id: 'page:test' as any,
			typeName: 'page',
			name: 'Test Page',
			index: 'a1' as any,
			meta: {},
		}

		expect(processRecord(shapeRecord)).toBe('Shape at (50, 100)')
		expect(processRecord(pageRecord)).toBe('Page: Test Page')
	})
})
