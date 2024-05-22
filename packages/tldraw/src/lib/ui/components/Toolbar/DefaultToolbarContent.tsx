import { GeoShapeGeoStyle, useEditor, useValue } from '@tldraw/editor'
import { TLUiToolItem, useTools } from '../../hooks/useTools'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'

/** @public */
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
			<TriangleToolbarItem />
			<DiamondToolbarItem />
			<CloudToolbarItem />
			<StarToolbarItem />
			<HexagonToolbarItem />
			<OvalToolbarItem />
			<TrapezoidToolbarItem />
			<RhombusToolbarItem />
			<XBoxToolbarItem />
			<CheckBoxToolbarItem />
			<ArrowLeftToolbarItem />
			<ArrowUpToolbarItem />
			<ArrowDownToolbarItem />
			<ArrowRightToolbarItem />
			<LineToolbarItem />
			<HighlightToolbarItem />
			<LaserToolbarItem />
			<FrameToolbarItem />
		</>
	)
}

/** @public */
export function useIsToolSelected(tool: TLUiToolItem) {
	const editor = useEditor()
	const geo = tool.meta?.geo
	return useValue(
		'is tool selected',
		() => {
			const activeToolId = editor.getCurrentToolId()
			const geoState = editor.getSharedStyles().getAsKnownValue(GeoShapeGeoStyle)
			return geo ? activeToolId === 'geo' && geoState === geo : activeToolId === tool.id
		},
		[editor, tool.id, geo]
	)
}

/** @public */
export function ToolbarItem({ tool }: { tool: string }) {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools[tool])
	return <TldrawUiMenuItem {...tools[tool]} isSelected={isSelected} />
}

/** @public */
export function SelectToolbarItem() {
	return <ToolbarItem tool="select" />
}

/** @public */
export function HandToolbarItem() {
	return <ToolbarItem tool="hand" />
}

/** @public */
export function DrawToolbarItem() {
	return <ToolbarItem tool="draw" />
}

/** @public */
export function EraserToolbarItem() {
	return <ToolbarItem tool="eraser" />
}

/** @public */
export function ArrowToolbarItem() {
	return <ToolbarItem tool="arrow" />
}

/** @public */
export function TextToolbarItem() {
	return <ToolbarItem tool="text" />
}

/** @public */
export function NoteToolbarItem() {
	return <ToolbarItem tool="note" />
}

/** @public */
export function AssetToolbarItem() {
	const tools = useTools()
	return <TldrawUiMenuItem {...tools['asset']} />
}

/** @public */
export function RectangleToolbarItem() {
	return <ToolbarItem tool="rectangle" />
}

/** @public */
export function EllipseToolbarItem() {
	return <ToolbarItem tool="ellipse" />
}

/** @public */
export function DiamondToolbarItem() {
	return <ToolbarItem tool="diamond" />
}

/** @public */
export function TriangleToolbarItem() {
	return <ToolbarItem tool="triangle" />
}

/** @public */
export function TrapezoidToolbarItem() {
	return <ToolbarItem tool="trapezoid" />
}

/** @public */
export function RhombusToolbarItem() {
	return <ToolbarItem tool="rhombus" />
}

/** @public */
export function PentagonToolbarItem() {
	return <ToolbarItem tool="pentagon" />
}

/** @public */
export function HeartToolbarItem() {
	return <ToolbarItem tool="heart" />
}

/** @public */
export function HexagonToolbarItem() {
	return <ToolbarItem tool="hexagon" />
}

/** @public */
export function CloudToolbarItem() {
	return <ToolbarItem tool="cloud" />
}

/** @public */
export function StarToolbarItem() {
	return <ToolbarItem tool="star" />
}

/** @public */
export function OvalToolbarItem() {
	return <ToolbarItem tool="oval" />
}

/** @public */
export function XBoxToolbarItem() {
	return <ToolbarItem tool="x-box" />
}

/** @public */
export function CheckBoxToolbarItem() {
	return <ToolbarItem tool="check-box" />
}

/** @public */
export function ArrowLeftToolbarItem() {
	return <ToolbarItem tool="arrow-left" />
}

/** @public */
export function ArrowUpToolbarItem() {
	return <ToolbarItem tool="arrow-up" />
}

/** @public */
export function ArrowDownToolbarItem() {
	return <ToolbarItem tool="arrow-down" />
}

/** @public */
export function ArrowRightToolbarItem() {
	return <ToolbarItem tool="arrow-right" />
}

/** @public */
export function LineToolbarItem() {
	return <ToolbarItem tool="line" />
}

/** @public */
export function HighlightToolbarItem() {
	return <ToolbarItem tool="highlight" />
}

/** @public */
export function FrameToolbarItem() {
	return <ToolbarItem tool="frame" />
}

/** @public */
export function LaserToolbarItem() {
	return <ToolbarItem tool="laser" />
}
