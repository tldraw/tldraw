import {
	atom,
	BaseBoxShapeUtil,
	Circle2d,
	createShapeId,
	Geometry2d,
	RecordProps,
	resizeBox,
	StateNode,
	T,
	TLBaseShape,
	TLEventHandlers,
	TLGeoShape,
	TLResizeInfo,
	TLShape,
	TLTextShape,
	toRichText,
	Vec,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'

// Custom Circle Clip Shape Definition
export type CircleClipShape = TLBaseShape<
	'circle-clip',
	{
		w: number
		h: number
	}
>

export const isClippingEnabled$ = atom('isClippingEnabled', true)

export class CircleClipShapeUtil extends BaseBoxShapeUtil<CircleClipShape> {
	static override type = 'circle-clip' as const
	static override props: RecordProps<CircleClipShape> = {
		w: T.number,
		h: T.number,
	}

	override canBind() {
		return false
	}

	override canReceiveNewChildrenOfType(shape: TLShape) {
		return !shape.isLocked
	}

	override getDefaultProps(): CircleClipShape['props'] {
		return {
			w: 200,
			h: 200,
		}
	}

	override getGeometry(shape: CircleClipShape): Geometry2d {
		const radius = Math.min(shape.props.w, shape.props.h) / 2
		return new Circle2d({
			radius,
			x: shape.props.w / 2 - radius,
			y: shape.props.h / 2 - radius,
			isFilled: true,
		})
	}

	override getClipPath(shape: CircleClipShape): Vec[] | undefined {
		// Generate a polygon approximation of the circle
		const centerX = shape.props.w / 2
		const centerY = shape.props.h / 2
		const radius = Math.min(shape.props.w, shape.props.h) / 2
		const segments = 48 // More segments = smoother circle

		const points: Vec[] = []
		for (let i = 0; i < segments; i++) {
			const angle = (i / segments) * Math.PI * 2
			const x = centerX + Math.cos(angle) * radius
			const y = centerY + Math.sin(angle) * radius
			points.push(new Vec(x, y))
		}

		return points
	}

	override shouldClipChild(_child: TLShape): boolean {
		// For now, clip all children - we removed the onlyClipText feature for simplicity
		return isClippingEnabled$.get()
	}

	override component(_shape: CircleClipShape) {
		// For testing purposes, we'll just return null
		// In a real implementation, this would return JSX
		return null as any
	}

	override indicator(_shape: CircleClipShape) {
		// For testing purposes, we'll just return null
		// In a real implementation, this would return JSX
		return null as any
	}

	override onResize(shape: CircleClipShape, info: TLResizeInfo<CircleClipShape>) {
		return resizeBox(shape, info)
	}
}

export class CircleClipShapeTool extends StateNode {
	static override id = 'circle-clip'

	override onEnter(): void {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown(info: Parameters<TLEventHandlers['onPointerDown']>[0]) {
		if (info.target === 'canvas') {
			const { originPagePoint } = this.editor.inputs

			this.editor.createShape<CircleClipShape>({
				type: 'circle-clip',
				x: originPagePoint.x - 100,
				y: originPagePoint.y - 100,
				props: {
					w: 200,
					h: 200,
				},
			})
		}
	}
}

let editor: TestEditor

afterEach(() => {
	editor?.dispose()
})

const ids = {
	circleClip1: createShapeId('circleClip1'),
	circleClip2: createShapeId('circleClip2'),
	text1: createShapeId('text1'),
	geo1: createShapeId('geo1'),
	geo2: createShapeId('geo2'),
}

beforeEach(() => {
	editor = new TestEditor({
		shapeUtils: [CircleClipShapeUtil],
		tools: [CircleClipShapeTool],
	})

	// Reset clipping state
	isClippingEnabled$.set(true)
})

describe('CircleClipShapeUtil', () => {
	describe('shape creation and properties', () => {
		it('should create a circle clip shape with default properties', () => {
			editor.createShape<CircleClipShape>({
				id: ids.circleClip1,
				type: 'circle-clip',
				x: 100,
				y: 100,
				props: {
					w: 200,
					h: 200,
				},
			})

			const shape = editor.getShape<CircleClipShape>(ids.circleClip1)
			expect(shape).toBeDefined()
			expect(shape!.type).toBe('circle-clip')
			expect(shape!.props.w).toBe(200)
			expect(shape!.props.h).toBe(200)
		})

		it('should use default props when not specified', () => {
			editor.createShape<CircleClipShape>({
				id: ids.circleClip1,
				type: 'circle-clip',
				x: 100,
				y: 100,
				props: {},
			})

			const shape = editor.getShape<CircleClipShape>(ids.circleClip1)
			expect(shape!.props.w).toBe(200) // default from getDefaultProps
			expect(shape!.props.h).toBe(200) // default from getDefaultProps
		})
	})

	describe('geometry and clipping', () => {
		it('should generate correct circle geometry', () => {
			editor.createShape<CircleClipShape>({
				id: ids.circleClip1,
				type: 'circle-clip',
				x: 100,
				y: 100,
				props: {
					w: 200,
					h: 200,
				},
			})

			const shape = editor.getShape<CircleClipShape>(ids.circleClip1)
			const util = editor.getShapeUtil<CircleClipShape>('circle-clip')
			const geometry = util.getGeometry(shape!)

			expect(geometry).toBeDefined()
			expect(geometry.bounds).toBeDefined()
			expect(geometry.bounds.width).toBe(200)
			expect(geometry.bounds.height).toBe(200)
		})

		it('should generate clip path for circle', () => {
			editor.createShape<CircleClipShape>({
				id: ids.circleClip1,
				type: 'circle-clip',
				x: 100,
				y: 100,
				props: {
					w: 200,
					h: 200,
				},
			})

			const shape = editor.getShape<CircleClipShape>(ids.circleClip1)
			const util = editor.getShapeUtil<CircleClipShape>('circle-clip')
			const clipPath = util.getClipPath?.(shape!)
			if (!clipPath) throw new Error('Clip path is undefined')

			expect(clipPath).toBeDefined()
			expect(Array.isArray(clipPath)).toBe(true)
			expect(clipPath.length).toBeGreaterThan(0)

			// Should be a polygon approximation of a circle
			// Check that points are roughly in a circle pattern
			const centerX = 100 // shape.x
			const centerY = 100 // shape.y
			const radius = 100 // min(w, h) / 2

			clipPath.forEach((point) => {
				const distance = Math.sqrt(Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2))
				expect(distance).toBeCloseTo(radius, 0)
			})
		})
	})

	describe('child clipping behavior', () => {
		it('should clip children when clipping is enabled', () => {
			editor.createShape<CircleClipShape>({
				id: ids.circleClip1,
				type: 'circle-clip',
				x: 100,
				y: 100,
				props: {
					w: 200,
					h: 200,
				},
			})

			editor.createShape<TLTextShape>({
				id: ids.text1,
				type: 'text',
				x: 0,
				y: 0,
				parentId: ids.circleClip1,
				props: {
					richText: toRichText('Test text'),
				},
			})

			const util = editor.getShapeUtil<CircleClipShape>('circle-clip')
			const textShape = editor.getShape<TLTextShape>(ids.text1)

			// Clipping should be enabled by default
			expect(isClippingEnabled$.get()).toBe(true)
			expect(util.shouldClipChild?.(textShape!)).toBe(true)
			expect(editor.getShapeClipPath(ids.text1)).toBeDefined()
		})

		it('should not clip children when clipping is disabled', () => {
			isClippingEnabled$.set(false)

			editor.createShape<CircleClipShape>({
				id: ids.circleClip1,
				type: 'circle-clip',
				x: 100,
				y: 100,
				props: {
					w: 200,
					h: 200,
				},
			})

			editor.createShape<TLTextShape>({
				id: ids.text1,
				type: 'text',
				x: 0,
				y: 0,
				parentId: ids.circleClip1,
				props: {
					richText: toRichText('Test text'),
				},
			})

			const util = editor.getShapeUtil<CircleClipShape>('circle-clip')
			const textShape = editor.getShape<TLTextShape>(ids.text1)

			expect(isClippingEnabled$.get()).toBe(false)
			expect(util.shouldClipChild?.(textShape!)).toBe(false)
			expect(editor.getShapeClipPath(ids.text1)).toBeUndefined()
		})
	})
})

describe('Integration tests', () => {
	it('should create and manage circle clip shapes with children', () => {
		// Create circle clip shape
		editor.createShape<CircleClipShape>({
			id: ids.circleClip1,
			type: 'circle-clip',
			x: 100,
			y: 100,
			props: {
				w: 200,
				h: 200,
			},
		})

		// Add text child
		editor.createShape<TLTextShape>({
			id: ids.text1,
			type: 'text',
			x: 50,
			y: 50,
			parentId: ids.circleClip1,
			props: {
				richText: toRichText('Clipped text'),
			},
		})

		// Add geo child
		editor.createShape<TLGeoShape>({
			id: ids.geo1,
			type: 'geo',
			x: 150,
			y: 150,
			parentId: ids.circleClip1,
			props: {
				w: 50,
				h: 50,
			},
		})

		const circleClipShape = editor.getShape<CircleClipShape>(ids.circleClip1)
		const textShape = editor.getShape<TLTextShape>(ids.text1)
		const geoShape = editor.getShape<TLGeoShape>(ids.geo1)

		expect(circleClipShape).toBeDefined()
		expect(textShape!.parentId).toBe(ids.circleClip1)
		expect(geoShape!.parentId).toBe(ids.circleClip1)

		// Verify clipping behavior
		const util = editor.getShapeUtil<CircleClipShape>('circle-clip')
		expect(util.shouldClipChild?.(textShape!)).toBe(true)
		expect(util.shouldClipChild?.(geoShape!)).toBe(true)
		expect(editor.getShapeClipPath(ids.text1)).toBeDefined()
		expect(editor.getShapeClipPath(ids.geo1)).toBeDefined()

		// Test clipping toggle
		isClippingEnabled$.set(false)
		expect(util.shouldClipChild?.(textShape!)).toBe(false)
		expect(util.shouldClipChild?.(geoShape!)).toBe(false)
		expect(editor.getShapeClipPath(ids.text1)).toBeUndefined()
		expect(editor.getShapeClipPath(ids.geo1)).toBeUndefined()
	})

	it('should handle multiple circle clip shapes independently', () => {
		// Create two circle clip shapes
		editor.createShape<CircleClipShape>({
			id: ids.circleClip1,
			type: 'circle-clip',
			x: 100,
			y: 100,
			props: {
				w: 200,
				h: 200,
			},
		})

		editor.createShape<CircleClipShape>({
			id: ids.circleClip2,
			type: 'circle-clip',
			x: 400,
			y: 100,
			props: {
				w: 150,
				h: 150,
			},
		})

		// Add children to both
		editor.createShape<TLTextShape>({
			id: ids.text1,
			type: 'text',
			x: 0,
			y: 0,
			parentId: ids.circleClip1,
			props: {
				richText: toRichText('First clip'),
			},
		})

		editor.createShape<TLTextShape>({
			id: ids.geo1,
			type: 'text',
			x: 0,
			y: 0,
			parentId: ids.circleClip2,
			props: {
				richText: toRichText('Second clip'),
			},
		})

		const util = editor.getShapeUtil<CircleClipShape>('circle-clip')
		const text1 = editor.getShape<TLTextShape>(ids.text1)
		const text2 = editor.getShape<TLTextShape>(ids.geo1)

		// Both should be clipped when enabled
		expect(util.shouldClipChild?.(text1!)).toBe(true)
		expect(util.shouldClipChild?.(text2!)).toBe(true)

		// Both should not be clipped when disabled
		isClippingEnabled$.set(false)
		expect(util.shouldClipChild?.(text1!)).toBe(false)
		expect(util.shouldClipChild?.(text2!)).toBe(false)
	})
})
