import { GeoShapeGeoStyle, useEditor, useValue } from '@tldraw/editor'
import { TLUiToolItem, useTools } from '../../hooks/useTools'
import { TldrawUiMenuToolItem } from '../primitives/menus/TldrawUiMenuToolItem'

/** @public @react */
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

			<HexagonToolbarItem />
			<OvalToolbarItem />
			<RhombusToolbarItem />
			<StarToolbarItem />

			<CloudToolbarItem />
			<HeartToolbarItem />
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
export function useIsToolSelected(tool: TLUiToolItem | undefined) {
	const editor = useEditor()
	const geo = tool?.meta?.geo
	return useValue(
		'is tool selected',
		() => {
			if (!tool) return false
			const activeToolId = editor.getCurrentToolId()
			if (activeToolId === 'geo') {
				return geo === editor.getSharedStyles().getAsKnownValue(GeoShapeGeoStyle)
			} else {
				return activeToolId === tool.id
			}
		},
		[editor, tool?.id, geo]
	)
}

/** @public */
export interface ToolbarItemProps {
	tool: string
}

/** @public @react */
export function ToolbarItem({ tool }: ToolbarItemProps) {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools[tool])
	return <TldrawUiMenuToolItem toolId={tool} isSelected={isSelected} />
}

/** @public @react */
export function SelectToolbarItem() {
	return <ToolbarItem tool="select" />
}

/** @public @react */
export function HandToolbarItem() {
	return <ToolbarItem tool="hand" />
}

/** @public @react */
export function DrawToolbarItem() {
	return <ToolbarItem tool="draw" />
}

/** @public @react */
export function EraserToolbarItem() {
	return <ToolbarItem tool="eraser" />
}

/** @public @react */
export function ArrowToolbarItem() {
	return <ToolbarItem tool="arrow" />
}

/** @public @react */
export function TextToolbarItem() {
	return <ToolbarItem tool="text" />
}

/** @public @react */
export function NoteToolbarItem() {
	return <ToolbarItem tool="note" />
}

/** @public @react */
export function AssetToolbarItem() {
	return <TldrawUiMenuToolItem toolId="asset" />
}

/** @public @react */
export function RectangleToolbarItem() {
	return <ToolbarItem tool="rectangle" />
}

/** @public @react */
export function EllipseToolbarItem() {
	return <ToolbarItem tool="ellipse" />
}

/** @public @react */
export function DiamondToolbarItem() {
	return <ToolbarItem tool="diamond" />
}

/** @public @react */
export function TriangleToolbarItem() {
	return <ToolbarItem tool="triangle" />
}

/** @public @react */
export function TrapezoidToolbarItem() {
	return <ToolbarItem tool="trapezoid" />
}

/** @public @react */
export function RhombusToolbarItem() {
	return <ToolbarItem tool="rhombus" />
}

/** @public @react */
export function PentagonToolbarItem() {
	return <ToolbarItem tool="pentagon" />
}

/** @public @react */
export function HeartToolbarItem() {
	return <ToolbarItem tool="heart" />
}

/** @public @react */
export function HexagonToolbarItem() {
	return <ToolbarItem tool="hexagon" />
}

/** @public @react */
export function CloudToolbarItem() {
	return <ToolbarItem tool="cloud" />
}

/** @public @react */
export function StarToolbarItem() {
	return <ToolbarItem tool="star" />
}

/** @public @react */
export function OvalToolbarItem() {
	return <ToolbarItem tool="oval" />
}

/** @public @react */
export function XBoxToolbarItem() {
	return <ToolbarItem tool="x-box" />
}

/** @public @react */
export function CheckBoxToolbarItem() {
	return <ToolbarItem tool="check-box" />
}

/** @public @react */
export function ArrowLeftToolbarItem() {
	return <ToolbarItem tool="arrow-left" />
}

/** @public @react */
export function ArrowUpToolbarItem() {
	return <ToolbarItem tool="arrow-up" />
}

/** @public @react */
export function ArrowDownToolbarItem() {
	return <ToolbarItem tool="arrow-down" />
}

/** @public @react */
export function ArrowRightToolbarItem() {
	return <ToolbarItem tool="arrow-right" />
}

/** @public @react */
export function LineToolbarItem() {
	return <ToolbarItem tool="line" />
}

/** @public @react */
export function HighlightToolbarItem() {
	return <ToolbarItem tool="highlight" />
}

/** @public @react */
export function FrameToolbarItem() {
	return <ToolbarItem tool="frame" />
}

/** @public @react */
export function LaserToolbarItem() {
	return <ToolbarItem tool="laser" />
}
