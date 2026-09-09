import { EMPTY_ARRAY } from '@tldraw/state'
import { RecordProps, TLShape, createShapeId } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { Rectangle2d } from '../../primitives/geometry/Rectangle2d'
import { TestEditor } from '../../test/TestEditor'
import { TEST_BOX_TYPE as MINIMAL_SHAPE_TYPE } from '../../test/testShapeTypes'
import { ShapeUtil, TLShapeUtilCanBindOpts } from './ShapeUtil'

type IMinimalShape = TLShape<typeof MINIMAL_SHAPE_TYPE>

interface MinimalOptions {
	padding: number
	label: string
}

class MinimalShapeUtil extends ShapeUtil<IMinimalShape> {
	static override type = MINIMAL_SHAPE_TYPE
	static override props: RecordProps<IMinimalShape> = { w: T.number, h: T.number }

	override options: MinimalOptions = { padding: 4, label: 'default' }

	getDefaultProps(): IMinimalShape['props'] {
		return { w: 100, h: 50 }
	}
	getGeometry(shape: IMinimalShape) {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	getIndicatorPath() {
		return undefined
	}
	component() {
		return null
	}
}

let editor: TestEditor
let util: MinimalShapeUtil
let shape: IMinimalShape

beforeEach(() => {
	editor = new TestEditor({ shapeUtils: [MinimalShapeUtil] })
	util = editor.getShapeUtil(MINIMAL_SHAPE_TYPE) as MinimalShapeUtil
	const id = createShapeId('minimal')
	editor.createShape({ id, type: MINIMAL_SHAPE_TYPE, x: 10, y: 20 })
	shape = editor.getShape<IMinimalShape>(id)!
})

afterEach(() => {
	editor.dispose()
})

describe('ShapeUtil', () => {
	it('is constructed with the editor it belongs to', () => {
		expect(util).toBeInstanceOf(MinimalShapeUtil)
		expect(util.editor).toBe(editor)
	})

	it('has no static props, migrations or handled asset types unless a subclass sets them', () => {
		expect(ShapeUtil.props).toBeUndefined()
		expect(ShapeUtil.migrations).toBeUndefined()
		expect(ShapeUtil.handledAssetTypes).toBeUndefined()
		expect(MinimalShapeUtil.migrations).toBeUndefined()
		expect(MinimalShapeUtil.handledAssetTypes).toBeUndefined()
	})

	describe('default capability flags', () => {
		it('answers the boolean capability queries with their documented defaults', () => {
			const flags = {
				canSnap: util.canSnap(shape),
				canTabTo: util.canTabTo(shape),
				canScroll: util.canScroll(shape),
				canEdit: util.canEdit(shape, { type: 'double-click' }),
				canResize: util.canResize(shape),
				canResizeChildren: util.canResizeChildren(shape),
				canEditInReadonly: util.canEditInReadonly(shape),
				canEditWhileLocked: util.canEditWhileLocked(shape),
				canCrop: util.canCrop(shape),
				canBeLaidOut: util.canBeLaidOut(shape, { type: 'align', shapes: [shape] }),
				canCull: util.canCull(shape),
				providesBackgroundForChildren: util.providesBackgroundForChildren(shape),
				hideResizeHandles: util.hideResizeHandles(shape),
				hideRotateHandle: util.hideRotateHandle(shape),
				hideSelectionBoundsBg: util.hideSelectionBoundsBg(shape),
				hideSelectionBoundsFg: util.hideSelectionBoundsFg(shape),
				isAspectRatioLocked: util.isAspectRatioLocked(shape),
				isFrameLike: util.isFrameLike(shape),
				isExportBoundsContainer: util.isExportBoundsContainer(shape),
				canReceiveNewChildrenOfType: util.canReceiveNewChildrenOfType(shape, 'group'),
				canRemoveChildrenOfType: util.canRemoveChildrenOfType(shape, 'group'),
			}
			expect(flags).toEqual({
				canSnap: true,
				canTabTo: true,
				canScroll: false,
				canEdit: false,
				canResize: true,
				canResizeChildren: true,
				canEditInReadonly: false,
				canEditWhileLocked: false,
				canCrop: false,
				canBeLaidOut: true,
				canCull: true,
				providesBackgroundForChildren: false,
				hideResizeHandles: false,
				hideRotateHandle: false,
				hideSelectionBoundsBg: false,
				hideSelectionBoundsFg: false,
				isAspectRatioLocked: false,
				isFrameLike: false,
				isExportBoundsContainer: false,
				canReceiveNewChildrenOfType: false,
				canRemoveChildrenOfType: true,
			})
		})

		it('allows bindings in either direction by default', () => {
			const opts: TLShapeUtilCanBindOpts = {
				fromShape: shape,
				toShape: { type: 'group' as const },
				bindingType: 'arrow',
				fromShapeType: shape.type,
				toShapeType: 'group',
			}
			expect(util.canBind(opts)).toBe(true)
			expect(util.canBind({ ...opts, fromShape: { type: 'group' as const }, toShape: shape })).toBe(
				true
			)
		})
	})

	describe('default values', () => {
		it('contributes no svg defs, fonts or user ids', () => {
			expect(util.getCanvasSvgDefs()).toEqual([])
			expect(util.getFontFaces(shape)).toBe(EMPTY_ARRAY)
			expect(util.getReferencedUserIds(shape)).toBe(EMPTY_ARRAY)
		})

		it('has empty snap geometry and no selection outline expansion', () => {
			expect(util.getBoundsSnapGeometry(shape)).toEqual({})
			expect(util.getHandleSnapGeometry(shape)).toEqual({})
			expect(util.expandSelectionOutlinePx(shape)).toBe(0)
		})

		it('has no text or aria descriptor', () => {
			expect(util.getText(shape)).toBeUndefined()
			expect(util.getAriaDescriptor(shape)).toBeUndefined()
		})

		it('leaves the optional hooks undefined so the editor can feature-detect them', () => {
			expect(util.getHandles).toBeUndefined()
			expect(util.toSvg).toBeUndefined()
			expect(util.toBackgroundSvg).toBeUndefined()
			expect(util.backgroundComponent).toBeUndefined()
			expect(util.getClipPath).toBeUndefined()
			expect(util.shouldClipChild).toBeUndefined()
			expect(util.hideInMinimap).toBeUndefined()
			expect(util.getInterpolatedProps).toBeUndefined()
			expect(util.createShapeForAsset).toBeUndefined()
			expect(util.onResize).toBeUndefined()
			expect(util.onChildrenChange).toBeUndefined()
			expect(util.onBeforeCreate).toBeUndefined()
			expect(util.onDoubleClick).toBeUndefined()
			expect(util.getAppOwnedElement).toBeUndefined()
		})

		it('starts with an empty options object when the subclass does not declare one', () => {
			class BareShapeUtil extends MinimalShapeUtil {
				static override type = MINIMAL_SHAPE_TYPE
				override options: any = undefined
			}
			// the base initializer runs before the subclass field, so the subclass wins
			expect(new BareShapeUtil(editor).options).toBeUndefined()
			expect(
				new (class extends ShapeUtil<any> {
					static override type = 'anon'
					getDefaultProps() {
						return {}
					}
					getGeometry() {
						return new Rectangle2d({ width: 1, height: 1, isFilled: false })
					}
					getIndicatorPath() {
						return undefined
					}
					component() {
						return null
					}
				})(editor).options
			).toEqual({})
		})
	})

	describe('configure', () => {
		it('returns a subclass whose instances merge the given options over the defaults', () => {
			const Configured = MinimalShapeUtil.configure({ padding: 12 })
			const configured = new Configured(editor)

			expect(configured).toBeInstanceOf(MinimalShapeUtil)
			expect(configured.options).toEqual({ padding: 12, label: 'default' })
		})

		it('keeps the static type, props and migrations of the original util', () => {
			const Configured = MinimalShapeUtil.configure({ label: 'custom' })
			expect(Configured.type).toBe(MINIMAL_SHAPE_TYPE)
			expect(Configured.props).toBe(MinimalShapeUtil.props)
			expect(Configured.migrations).toBe(MinimalShapeUtil.migrations)
		})

		it('does not mutate the original util class', () => {
			MinimalShapeUtil.configure({ padding: 99, label: 'changed' })
			expect(new MinimalShapeUtil(editor).options).toEqual({ padding: 4, label: 'default' })
		})

		it('chains so later configurations layer over earlier ones', () => {
			const Twice = MinimalShapeUtil.configure({ padding: 1 }).configure({ label: 'twice' })
			expect(new Twice(editor).options).toEqual({ padding: 1, label: 'twice' })
		})

		it('is usable as the shape util registered with an editor', () => {
			const Configured = MinimalShapeUtil.configure({ padding: 7 })
			const other = new TestEditor({ shapeUtils: [Configured] })
			try {
				const registered = other.getShapeUtil(MINIMAL_SHAPE_TYPE) as MinimalShapeUtil
				expect(registered).toBeInstanceOf(MinimalShapeUtil)
				expect(registered.options).toEqual({ padding: 7, label: 'default' })
				expect(registered.editor).toBe(other)
			} finally {
				other.dispose()
			}
		})
	})
})
