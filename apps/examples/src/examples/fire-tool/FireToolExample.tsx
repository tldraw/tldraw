import classNames from 'classnames'
import {
	StateNode,
	TLComponents,
	TLFrameShape,
	TLGroupShape,
	TLPointerEventInfo,
	TLScribbleProps,
	TLShapeId,
	TLTextShape,
	Tldraw,
	pointInPolygon,
	toRichText,
	useSharedSafeId,
} from 'tldraw'
import 'tldraw/tldraw.css'

class FireTool extends StateNode {
	static override id = 'fire'
	static override initial = 'idle'
	static override isLockable = false
	static override children() {
		return [Idle, Pointing, Erasing]
	}
	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}
}

class Idle extends StateNode {
	static override id = 'idle'
	override onPointerDown(info: TLPointerEventInfo) {
		this.parent.transition('pointing', info)
	}
	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}

class Pointing extends StateNode {
	static override id = 'pointing'
	override onEnter() {
		const zoomLevel = this.editor.getZoomLevel()
		const currentPageShapesSorted = this.editor.getCurrentPageRenderingShapesSorted()
		const {
			inputs: { currentPagePoint },
		} = this.editor
		const erasing = new Set<TLShapeId>()
		const initialSize = erasing.size
		for (let n = currentPageShapesSorted.length, i = n - 1; i >= 0; i--) {
			const shape = currentPageShapesSorted[i]
			if (
				this.editor.isShapeOrAncestorLocked(shape) ||
				this.editor.isShapeOfType<TLGroupShape>(shape, 'group')
			) {
				continue
			}
			if (
				this.editor.isPointInShape(shape, currentPagePoint, {
					hitInside: false,
					margin: this.editor.options.hitTestMargin / zoomLevel,
				})
			) {
				const hitShape = this.editor.getOutermostSelectableShape(shape)
				if (
					this.editor.isShapeOfType<TLFrameShape>(hitShape, 'frame') &&
					erasing.size > initialSize
				) {
					break
				}
				erasing.add(hitShape.id)
			}
		}
		this.editor.setErasingShapes([...erasing])
	}
	override onLongPress(info: TLPointerEventInfo) {
		this.startErasing(info)
	}
	override onExit(_info: any, to: string) {
		if (to !== 'erasing') {
			this.editor.setErasingShapes([])
		}
	}
	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.isDragging) {
			this.startErasing(info)
		}
	}
	override onPointerUp() {
		this.complete()
	}
	override onCancel() {
		this.cancel()
	}
	override onComplete() {
		this.complete()
	}
	override onInterrupt() {
		this.cancel()
	}
	private startErasing(info: TLPointerEventInfo) {
		this.parent.transition('erasing', info)
	}
	complete() {
		const erasingShapeIds = this.editor.getErasingShapeIds()
		if (erasingShapeIds.length) {
			this.editor.markHistoryStoppingPoint('erase end')
			this.editor.deleteShapes(erasingShapeIds)
		}
		this.parent.transition('idle')
	}
	cancel() {
		this.parent.transition('idle')
	}
}

class Erasing extends StateNode {
	static override id = 'erasing'
	private info = {} as TLPointerEventInfo
	private scribbleId = 'id'
	private markId = ''
	private excludedShapeIds = new Set<TLShapeId>()
	override onEnter(info: TLPointerEventInfo) {
		this.markId = this.editor.markHistoryStoppingPoint('erase scribble begin')
		this.info = info
		const { originPagePoint } = this.editor.inputs
		this.excludedShapeIds = new Set(
			this.editor
				.getCurrentPageShapes()
				.filter((shape) => {
					if (this.editor.isShapeOrAncestorLocked(shape)) return true
					if (
						this.editor.isShapeOfType<TLGroupShape>(shape, 'group') ||
						this.editor.isShapeOfType<TLFrameShape>(shape, 'frame')
					) {
						const pointInShapeShape = this.editor.getPointInShapeSpace(shape, originPagePoint)
						const geometry = this.editor.getShapeGeometry(shape)
						return geometry.bounds.containsPoint(pointInShapeShape)
					}
					return false
				})
				.map((shape) => shape.id)
		)
		const scribble = this.editor.scribbles.addScribble({
			color: 'muted-1',
			size: 12,
		})
		this.scribbleId = scribble.id
		this.update()
	}
	private pushPointToScribble() {
		const { x, y } = this.editor.inputs.currentPagePoint
		this.editor.scribbles.addPoint(this.scribbleId, x, y)
	}
	override onExit() {
		this.editor.setErasingShapes([])
		this.editor.scribbles.stop(this.scribbleId)
	}
	override onPointerMove() {
		this.update()
	}
	override onPointerUp() {
		this.complete()
	}
	override onCancel() {
		this.cancel()
	}
	override onComplete() {
		this.complete()
	}
	update() {
		const { editor, excludedShapeIds } = this
		const erasingShapeIds = editor.getErasingShapeIds()
		const zoomLevel = editor.getZoomLevel()
		const currentPageShapes = editor.getCurrentPageRenderingShapesSorted()
		const {
			inputs: { currentPagePoint, previousPagePoint },
		} = editor
		this.pushPointToScribble()
		const erasing = new Set<TLShapeId>(erasingShapeIds)
		const minDist = this.editor.options.hitTestMargin / zoomLevel
		for (const shape of currentPageShapes) {
			if (editor.isShapeOfType<TLGroupShape>(shape, 'group')) continue
			const pageMask = editor.getShapeMask(shape.id)
			if (pageMask && !pointInPolygon(currentPagePoint, pageMask)) {
				continue
			}
			const geometry = editor.getShapeGeometry(shape)
			const pageTransform = editor.getShapePageTransform(shape)
			if (!geometry || !pageTransform) continue
			const pt = pageTransform.clone().invert()
			const A = pt.applyToPoint(previousPagePoint)
			const B = pt.applyToPoint(currentPagePoint)
			const { bounds } = geometry
			if (
				bounds.minX - minDist > Math.max(A.x, B.x) ||
				bounds.minY - minDist > Math.max(A.y, B.y) ||
				bounds.maxX + minDist < Math.min(A.x, B.x) ||
				bounds.maxY + minDist < Math.min(A.y, B.y)
			) {
				continue
			}
			if (geometry.hitTestLineSegment(A, B, minDist)) {
				erasing.add(editor.getOutermostSelectableShape(shape).id)
			}
		}
		this.editor.setErasingShapes([...erasing].filter((id) => !excludedShapeIds.has(id)))
	}
	complete() {
		const { editor } = this
		editor.deleteShapes(editor.getCurrentPageState().erasingShapeIds)
		this.parent.transition('idle')
	}
	cancel() {
		const { editor } = this
		editor.bailToMark(this.markId)
		this.parent.transition('idle', this.info)
	}
}

function FireScribble({ scribble, opacity, className }: TLScribbleProps) {
	if (!scribble.points.length) return null
	const pts = scribble.points.map((p) => `${p.x},${p.y}`).join(' ')
	const id = useSharedSafeId('fire-glow')
	return (
		<svg className={className ? classNames('tl-overlays__item', className) : 'tl-overlays__item'}>
			<defs>
				<filter id={id} x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation="4" result="blur" />
					<feMerge>
						<feMergeNode in="blur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>
			<polyline
				points={pts}
				stroke="orange"
				strokeWidth={scribble.size}
				fill="none"
				filter={`url(#${id})`}
				opacity={opacity ?? scribble.opacity}
			/>
		</svg>
	)
}

const components: TLComponents = {
	Scribble: FireScribble,
}

export default function FireToolExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				tools={[FireTool]}
				components={components}
				initialState="fire"
				hideUi
				onMount={(editor) => {
					editor.createShape<TLTextShape>({
						type: 'text',
						x: 60,
						y: 60,
						props: { richText: toRichText('Use the pointer to burn shapes!') },
					})
				}}
			/>
		</div>
	)
}
