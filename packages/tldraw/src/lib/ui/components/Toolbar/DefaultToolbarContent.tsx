import { GeoShapeGeoStyle, useEditor, useValue } from '@tldraw/editor'
import { TLUiToolItem, useTools } from '../../hooks/useTools'
import { TldrawUiToolbarButton } from './TldrawUiToolbarButton'

export function DefaultToolbarContent() {
	return (
		<>
			<SelectToolbarItem />
			<HandToolbarItem />
			<DrawToolbarItem />
			<EraserToolbarItem />
			<ArrowToolbarItem />
			<TextToolbarItem />
			<NoteToolbarItem />
			<AssetToolbarItem />
			<RectangleToolbarItem />
			<EllipseToolbarItem />
			<DiamondToolbarItem />
			<TriangleToolbarItem />
			<TrapezoidToolbarItem />
			<RhombusToolbarItem />
			<HexagonToolbarItem />
			<CloudToolbarItem />
			<StarToolbarItem />
			<OvalToolbarItem />
			<XBoxToolbarItem />
			<CheckBoxToolbarItem />
			<ArrowLeftToolbarItem />
			<ArrowUpToolbarItem />
			<ArrowDownToolbarItem />
			<ArrowRightToolbarItem />
			<LineToolbarItem />
			<HighlightToolbarItem />
			<FrameToolbarItem />
			<LaserToolbarItem />
		</>
	)
}

function DefaultToolbarItem({ tool }: { tool: TLUiToolItem }) {
	const editor = useEditor()
	const isSelected = useValue(
		'is tool selected',
		() => {
			const activeToolId = editor.getCurrentToolId()
			const geoState = editor.getSharedStyles().getAsKnownValue(GeoShapeGeoStyle)
			return tool.meta?.geo
				? activeToolId === 'geo' && geoState === tool.meta?.geo
				: activeToolId === tool.id
		},
		[editor, tool]
	)
	const isEnabled = useValue(
		'is tool enabled',
		() => {
			const isReadonlyMode = editor.getInstanceState().isReadonly
			return isReadonlyMode ? !!tool.readonlyOk : true
		},
		[editor, tool]
	)

	if (!isEnabled) return null
	return <TldrawUiToolbarButton {...tool} isSelected={isSelected} />
}

export function SelectToolbarItem() {
	return <DefaultToolbarItem tool={useTools().select} />
}

export function HandToolbarItem() {
	return <DefaultToolbarItem tool={useTools().hand} />
}

export function DrawToolbarItem() {
	return <DefaultToolbarItem tool={useTools().draw} />
}

export function EraserToolbarItem() {
	return <DefaultToolbarItem tool={useTools().eraser} />
}

export function ArrowToolbarItem() {
	return <DefaultToolbarItem tool={useTools().arrow} />
}

export function TextToolbarItem() {
	return <DefaultToolbarItem tool={useTools().text} />
}

export function NoteToolbarItem() {
	return <DefaultToolbarItem tool={useTools().note} />
}

export function AssetToolbarItem() {
	return <DefaultToolbarItem tool={useTools().asset} />
}

export function RectangleToolbarItem() {
	return <DefaultToolbarItem tool={useTools().rectangle} />
}

export function EllipseToolbarItem() {
	return <DefaultToolbarItem tool={useTools().ellipse} />
}

export function DiamondToolbarItem() {
	return <DefaultToolbarItem tool={useTools().diamond} />
}

export function TriangleToolbarItem() {
	return <DefaultToolbarItem tool={useTools().triangle} />
}

export function TrapezoidToolbarItem() {
	return <DefaultToolbarItem tool={useTools().trapezoid} />
}

export function RhombusToolbarItem() {
	return <DefaultToolbarItem tool={useTools().rhombus} />
}

export function HexagonToolbarItem() {
	return <DefaultToolbarItem tool={useTools().hex} />
}

export function CloudToolbarItem() {
	return <DefaultToolbarItem tool={useTools().cloud} />
}

export function StarToolbarItem() {
	return <DefaultToolbarItem tool={useTools().star} />
}

export function OvalToolbarItem() {
	return <DefaultToolbarItem tool={useTools().oval} />
}

export function XBoxToolbarItem() {
	return <DefaultToolbarItem tool={useTools().xBox} />
}

export function CheckBoxToolbarItem() {
	return <DefaultToolbarItem tool={useTools().checkBox} />
}

export function ArrowLeftToolbarItem() {
	return <DefaultToolbarItem tool={useTools().arrowLeft} />
}

export function ArrowUpToolbarItem() {
	return <DefaultToolbarItem tool={useTools().arrowUp} />
}

export function ArrowDownToolbarItem() {
	return <DefaultToolbarItem tool={useTools().arrowDown} />
}

export function ArrowRightToolbarItem() {
	return <DefaultToolbarItem tool={useTools().arrowRight} />
}

export function LineToolbarItem() {
	return <DefaultToolbarItem tool={useTools().line} />
}

export function HighlightToolbarItem() {
	return <DefaultToolbarItem tool={useTools().highlight} />
}

export function FrameToolbarItem() {
	return <DefaultToolbarItem tool={useTools().frame} />
}

export function LaserToolbarItem() {
	return <DefaultToolbarItem tool={useTools().laser} />
}
