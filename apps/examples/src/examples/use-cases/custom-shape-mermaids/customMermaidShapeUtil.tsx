import {
	BaseBoxShapeUtil,
	HTMLContainer,
	LABEL_FONT_SIZES,
	RecordProps,
	RichTextLabel,
	T,
	TLShape,
	TEXT_PROPS,
	getColorValue,
	toRichText,
	useDefaultColorTheme,
	useValue,
	useEditor,
} from 'tldraw'
import './customMermaidShapeUtil.css'
import { type StepStatus, pipelineStateAtom, retryPipelineFromNode } from './mermaidPipelineState'

export const CUSTOM_SHAPE_TYPE = 'flowchart-util'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[CUSTOM_SHAPE_TYPE]: {
			w: number
			h: number
			fill: string
			color: string
			dash: string
			size: string
			font: string
			richText: any
			align: string
			verticalAlign: string
			mermaidNodeId: string
			/** 1-based Kahn layer after import; set in `applyPipelineStepIndices` from the canvas DAG. */
			pipelineStepIndex: number
		}
	}
}
export type ICustomShape = TLShape<typeof CUSTOM_SHAPE_TYPE>

export class FlowchartShapeUtil extends BaseBoxShapeUtil<ICustomShape> {
	static override type = CUSTOM_SHAPE_TYPE
	static override props: RecordProps<ICustomShape> = {
		w: T.number,
		h: T.number,
		fill: T.string,
		color: T.string,
		dash: T.string,
		size: T.string,
		font: T.string,
		richText: T.unknownObject,
		align: T.string,
		verticalAlign: T.string,
		mermaidNodeId: T.string,
		pipelineStepIndex: T.number,
	}

	override getDefaultProps() {
		return {
			w: 100,
			h: 100,
			fill: 'none',
			color: 'black',
			dash: 'draw',
			size: 'm',
			font: 'draw',
			richText: toRichText(''),
			align: 'middle',
			verticalAlign: 'middle',
			mermaidNodeId: '',
			pipelineStepIndex: 0,
		}
	}

	override canEdit() {
		return false
	}

	override component(shape: ICustomShape) {
		return <CustomShapeComponent shape={shape} />
	}

	override indicator(shape: ICustomShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

function CustomShapeComponent({ shape }: { shape: ICustomShape }) {
	const { id, type, props } = shape
	const theme = useDefaultColorTheme()
	const editor = useEditor()
	const pipeline = useValue(pipelineStateAtom)
	const status: StepStatus = props.mermaidNodeId
		? (pipeline.statusByNodeId[props.mermaidNodeId] ?? 'pending')
		: 'pending'

	const isOnlySelected = useValue(
		'flowchartUtilOnlySelected',
		() => shape.id === editor.getOnlySelectedShapeId(),
		[editor, shape.id]
	)

	return (
		<HTMLContainer
			className={`flowchart-util-shape flowchart-util-shape--${status}`}
			style={{ width: shape.props.w, height: shape.props.h }}
		>
			{props.pipelineStepIndex > 0 && (
				<div className="flowchart-util-shape__step-badge">Step {props.pipelineStepIndex}</div>
			)}
			<div className="flowchart-util-shape__label">
				<RichTextLabel
					shapeId={id}
					type={type}
					font={props.font as any}
					fontSize={
						LABEL_FONT_SIZES[props.size as keyof typeof LABEL_FONT_SIZES] ?? LABEL_FONT_SIZES.m
					}
					lineHeight={TEXT_PROPS.lineHeight}
					padding={12}
					fill={props.fill as any}
					align={props.align as any}
					verticalAlign={props.verticalAlign as any}
					richText={props.richText}
					isSelected={isOnlySelected}
					labelColor={getColorValue(theme, props.color as any, 'solid')}
					wrap
					showTextOutline={false}
				/>
			</div>
			{status === 'failed' && (
				<button
					type="button"
					className="flowchart-util-shape__retry"
					// So the select tool does not treat the press as a canvas/shape drag before `click` fires.
					onPointerDown={editor.markEventAsHandled}
					onClick={() => void retryPipelineFromNode(props.mermaidNodeId)}
				>
					Retry
				</button>
			)}
		</HTMLContainer>
	)
}
