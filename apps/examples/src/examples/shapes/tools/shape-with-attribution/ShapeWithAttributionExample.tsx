import {
	BaseBoxShapeUtil,
	HTMLContainer,
	RecordProps,
	T,
	TLShape,
	Tldraw,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './shape-with-attribution.css'

// There's a guide at the bottom of this file!

const ATTRIBUTED_CARD = 'attributed-card'

// [1]
declare module 'tldraw' {
	interface TLGlobalShapePropsMap {
		[ATTRIBUTED_CARD]: { w: number; h: number; label: string }
	}
}

type AttributedCardShape = TLShape<typeof ATTRIBUTED_CARD>

// [2]
function AttributedCardComponent({ shape }: { shape: AttributedCardShape }) {
	const editor = useEditor()

	const attribution = useValue(
		'card-attribution',
		() => {
			const { createdBy, updatedBy, createdAt, updatedAt } = shape.tlmeta

			const createdByName = createdBy
				? (editor.getAttributionDisplayName(createdBy) ?? createdBy)
				: null
			const updatedByName = updatedBy
				? (editor.getAttributionDisplayName(updatedBy) ?? updatedBy)
				: null

			return { createdByName, updatedByName, createdAt, updatedAt }
		},
		[shape.tlmeta, editor]
	)

	return (
		<HTMLContainer>
			<div className="attributed-card">
				<div className="attributed-card-label">{shape.props.label}</div>
				<div className="attributed-card-meta">
					{attribution.createdByName && (
						<div className="attributed-card-row">
							<span>Created by</span>
							<span className="attributed-card-user">{attribution.createdByName}</span>
						</div>
					)}
					{attribution.updatedByName && (
						<div className="attributed-card-row">
							<span>Edited by</span>
							<span className="attributed-card-user">{attribution.updatedByName}</span>
						</div>
					)}
					{attribution.updatedAt && (
						<div className="attributed-card-row">
							<span>Last edit</span>
							<span>{new Date(attribution.updatedAt).toLocaleTimeString()}</span>
						</div>
					)}
				</div>
			</div>
		</HTMLContainer>
	)
}

// [3]
class AttributedCardUtil extends BaseBoxShapeUtil<AttributedCardShape> {
	static override type = ATTRIBUTED_CARD
	static override props: RecordProps<AttributedCardShape> = {
		w: T.number,
		h: T.number,
		label: T.string,
	}

	getDefaultProps(): AttributedCardShape['props'] {
		return { w: 220, h: 140, label: 'Attributed card' }
	}

	component(shape: AttributedCardShape) {
		return <AttributedCardComponent shape={shape} />
	}

	indicator(shape: AttributedCardShape) {
		return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />
	}
}

const shapeUtils = [AttributedCardUtil]

// [4]
export default function ShapeWithAttributionExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				onMount={(editor) => {
					editor.createShape({
						type: ATTRIBUTED_CARD,
						x: 380,
						y: 100,
						props: { label: 'Resize me!' },
					})
				}}
			/>
		</div>
	)
}

/*
[1]
Register the custom shape type. Our shape has a fixed width/height and a label.
Every shape automatically gets a `tlmeta` field (with `createdBy`, `updatedBy`,
`createdAt`, `updatedAt`) — no extra props needed for attribution.

[2]
A React component that renders the shape body. We use `useEditor()` to access
the identity provider and `useValue()` to reactively read `shape.tlmeta`. The
`editor.getAttributionDisplayName(userId)` call resolves the stored user ID
into a human-readable display name.

[3]
We extend BaseBoxShapeUtil so we get resize handling for free. The `component`
method delegates to our React component that reads attribution data.

[4]
Mount the editor with our custom shape util and create two cards on the canvas.
Try moving, resizing, or editing the cards — the "Edited by" and "Last edit"
fields update automatically.
*/
