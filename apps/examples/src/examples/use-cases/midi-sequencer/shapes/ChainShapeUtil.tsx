import {
	BaseBoxShapeTool,
	BaseFrameLikeShapeUtil,
	Editor,
	Group2d,
	HTMLContainer,
	Rectangle2d,
	T,
	TLResizeInfo,
	TLShape,
	TLShapeId,
	resizeBox,
	useEditor,
	useValue,
} from 'tldraw'
import { MidiEngine } from '../engine/MidiEngine'
import { ChainIcon } from '../icons'
import { SequenceShape } from './SequenceShapeUtil'
import { CHAIN_TYPE, HEADER_HEIGHT, SEQUENCE_TYPE } from './shared'

interface ChainProps {
	w: number
	h: number
	name: string
}

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[CHAIN_TYPE]: ChainProps
	}
}

export type ChainShape = TLShape<typeof CHAIN_TYPE>

/**
 * A chain's members are the sequence shapes parented to it (dropping a sequence
 * inside the chain reparents it). Members are ordered left to right, which gives
 * the chain its "timeline" of sequences.
 */
export function getChainMemberIds(editor: Editor, chain: ChainShape): TLShapeId[] {
	const members: { id: TLShapeId; x: number }[] = []
	for (const id of editor.getSortedChildIdsForParent(chain.id)) {
		const shape = editor.getShape(id)
		if (shape?.type !== SEQUENCE_TYPE) continue
		const bounds = editor.getShapePageBounds(id)
		members.push({ id, x: bounds ? bounds.minX : 0 })
	}
	return members.sort((a, b) => a.x - b.x).map((m) => m.id)
}

// The chain is a real frame-like container: it clips and parents its children,
// requires full-brush selection, and carries its sequences when moved. We only
// accept sequences as children; everything else comes from BaseFrameLikeShapeUtil.
export class ChainShapeUtil extends BaseFrameLikeShapeUtil<ChainShape> {
	static override type = CHAIN_TYPE
	static override props = {
		w: T.positiveNumber,
		h: T.positiveNumber,
		name: T.string,
	}

	override getDefaultProps(): ChainProps {
		return { w: 820, h: 460, name: 'Chain' }
	}

	// Frame-like shapes need a Group2d geometry with a label child — the
	// hit-tester iterates geometry.children for them.
	override getGeometry(shape: ChainShape) {
		return new Group2d({
			children: [
				new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: false }),
				new Rectangle2d({
					x: 0,
					y: 0,
					width: Math.min(shape.props.w, 160),
					height: HEADER_HEIGHT,
					isFilled: true,
					isLabel: true,
					excludeFromShapeBounds: true,
				}),
			],
		})
	}

	override canReceiveNewChildrenOfType(shape: ChainShape, type: TLShape['type']) {
		return !shape.isLocked && type === SEQUENCE_TYPE
	}

	// Resizing the chain must NOT scale the sequences inside it (the base frame
	// class leaves this at the default `true`; only FrameShapeUtil opts out).
	override canResizeChildren() {
		return false
	}

	override onResize(shape: ChainShape, info: TLResizeInfo<ChainShape>) {
		return resizeBox(shape, info, { minWidth: 280, minHeight: 160 })
	}

	override component(shape: ChainShape) {
		return <ChainComponent shape={shape} />
	}

	override getIndicatorPath(shape: ChainShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

function ChainComponent({ shape }: { shape: ChainShape }) {
	const editor = useEditor()
	const engine = MidiEngine.get(editor)
	const { w, h, name } = shape.props

	const memberNames = useValue(
		'chain members',
		() => {
			const ids = getChainMemberIds(editor, shape)
			return ids.map((id) => {
				const seq = editor.getShape(id) as SequenceShape | undefined
				return { id, name: seq?.props.name ?? 'Sequence' }
			})
		},
		[editor, shape]
	)
	const activeIndex = useValue('chain active', () => engine.getActiveChainIndex(shape.id), [
		engine,
		shape.id,
	])

	return (
		<HTMLContainer className="midi-chain" style={{ width: w, height: h }}>
			<div className="midi-chain__header" style={{ height: HEADER_HEIGHT }}>
				<span className="midi-chain__title">
					<ChainIcon size={14} /> {name}
				</span>
				<span className="midi-chain__hint">
					drop sequences inside · each advances after its own loop count
				</span>
			</div>
			<div className="midi-chain__track">
				{memberNames.length === 0 ? (
					<span className="midi-chain__empty">no sequences yet</span>
				) : (
					memberNames.map((m, i) => (
						<button
							key={m.id}
							className={`midi-chain__pill ${i === activeIndex ? 'is-active' : ''}`}
							title="Select this sequence"
							onPointerDown={(e) => e.stopPropagation()}
							onClick={(e) => {
								e.stopPropagation()
								editor.select(m.id)
							}}
						>
							<span className="midi-chain__index">{i + 1}</span>
							{m.name}
						</button>
					))
				)}
			</div>
		</HTMLContainer>
	)
}

export class ChainShapeTool extends BaseBoxShapeTool {
	static override id = CHAIN_TYPE
	override shapeType = CHAIN_TYPE as typeof CHAIN_TYPE
}
