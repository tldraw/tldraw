import { GeoShapeGeoStyle, useEditor, useValue } from '@tldraw/editor'
import { TLUiToolItem, useTools } from '../../hooks/useTools'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'

/** @public @react */
export function DefaultToolbarContent() {
	return (
		<>
			<TldrawUiMenuItem tool="select" />
			<TldrawUiMenuItem tool="hand" />
			<TldrawUiMenuItem tool="draw" />
			<TldrawUiMenuItem tool="eraser" />
			<TldrawUiMenuItem tool="arrow" />
			<TldrawUiMenuItem tool="text" />
			<TldrawUiMenuItem tool="note" />
			<TldrawUiMenuItem tool="asset" />
			<TldrawUiMenuItem tool="rectangle" />
			<TldrawUiMenuItem tool="ellipse" />
			<TldrawUiMenuItem tool="triangle" />
			<TldrawUiMenuItem tool="diamond" />
			<TldrawUiMenuItem tool="hexagon" />
			<TldrawUiMenuItem tool="oval" />
			<TldrawUiMenuItem tool="rhombus" />
			<TldrawUiMenuItem tool="star" />
			<TldrawUiMenuItem tool="cloud" />
			<TldrawUiMenuItem tool="heart" />
			<TldrawUiMenuItem tool="x-box" />
			<TldrawUiMenuItem tool="check-box" />
			<TldrawUiMenuItem tool="arrow-left" />
			<TldrawUiMenuItem tool="arrow-up" />
			<TldrawUiMenuItem tool="arrow-down" />
			<TldrawUiMenuItem tool="arrow-right" />
			<TldrawUiMenuItem tool="line" />
			<TldrawUiMenuItem tool="highlight" />
			<TldrawUiMenuItem tool="laser" />
			<TldrawUiMenuItem tool="frame" />
		</>
	)
}

/**
 * @public
 * @deprecated - this is automatically inferred by {@link TldrawUiMenuItem}.
 */
export function useIsToolSelected(toolName: TLUiToolItem | string) {
	const editor = useEditor()
	const tools = useTools()
	const tool = typeof toolName === 'string' ? tools[toolName] : toolName
	const geo = tool?.meta?.geo
	return useValue(
		'is tool selected',
		() => {
			if (!tool) return false
			const activeToolId = editor.getCurrentToolId()
			const geoState = editor.getSharedStyles().getAsKnownValue(GeoShapeGeoStyle)
			return geo ? activeToolId === 'geo' && geoState === geo : activeToolId === tool.id
		},
		[editor, tool, geo]
	)
}

/** @public */
export interface ToolbarItemProps {
	tool: string
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool={tool} />`
 */
export function ToolbarItem({ tool }: ToolbarItemProps) {
	return <TldrawUiMenuItem tool={tool} />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="select" />`
 */
export function SelectToolbarItem() {
	return <TldrawUiMenuItem tool="select" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="hand" />`
 */
export function HandToolbarItem() {
	return <TldrawUiMenuItem tool="hand" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="draw" />`
 */
export function DrawToolbarItem() {
	return <TldrawUiMenuItem tool="draw" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="eraser" />`
 */
export function EraserToolbarItem() {
	return <TldrawUiMenuItem tool="eraser" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="arrow" />`
 */
export function ArrowToolbarItem() {
	return <TldrawUiMenuItem tool="arrow" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="text" />`
 */
export function TextToolbarItem() {
	return <TldrawUiMenuItem tool="text" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="note" />`
 */
export function NoteToolbarItem() {
	return <TldrawUiMenuItem tool="note" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="asset" />`
 */
export function AssetToolbarItem() {
	return <TldrawUiMenuItem tool="asset" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="rectangle" />`
 */
export function RectangleToolbarItem() {
	return <TldrawUiMenuItem tool="rectangle" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="ellipse" />`
 */
export function EllipseToolbarItem() {
	return <TldrawUiMenuItem tool="ellipse" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="diamond" />`
 */
export function DiamondToolbarItem() {
	return <TldrawUiMenuItem tool="diamond" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="triangle" />`
 */
export function TriangleToolbarItem() {
	return <TldrawUiMenuItem tool="triangle" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="trapezoid" />`
 */
export function TrapezoidToolbarItem() {
	return <TldrawUiMenuItem tool="trapezoid" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="rhombus" />`
 */
export function RhombusToolbarItem() {
	return <TldrawUiMenuItem tool="rhombus" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="pentagon" />`
 */
export function PentagonToolbarItem() {
	return <TldrawUiMenuItem tool="pentagon" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="heart" />`
 */
export function HeartToolbarItem() {
	return <TldrawUiMenuItem tool="heart" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="hexagon" />`
 */
export function HexagonToolbarItem() {
	return <TldrawUiMenuItem tool="hexagon" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="cloud" />`
 */
export function CloudToolbarItem() {
	return <TldrawUiMenuItem tool="cloud" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="star" />`
 */
export function StarToolbarItem() {
	return <TldrawUiMenuItem tool="star" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="oval" />`
 */
export function OvalToolbarItem() {
	return <TldrawUiMenuItem tool="oval" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="x-box" />`
 */
export function XBoxToolbarItem() {
	return <TldrawUiMenuItem tool="x-box" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="check-box" />`
 */
export function CheckBoxToolbarItem() {
	return <TldrawUiMenuItem tool="check-box" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="arrow-left" />`
 */
export function ArrowLeftToolbarItem() {
	return <TldrawUiMenuItem tool="arrow-left" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="arrow-up" />`
 */
export function ArrowUpToolbarItem() {
	return <TldrawUiMenuItem tool="arrow-up" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="arrow-down" />`
 */
export function ArrowDownToolbarItem() {
	return <TldrawUiMenuItem tool="arrow-down" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="arrow-right" />`
 */
export function ArrowRightToolbarItem() {
	return <TldrawUiMenuItem tool="arrow-right" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="line" />`
 */
export function LineToolbarItem() {
	return <TldrawUiMenuItem tool="line" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="highlight" />`
 */
export function HighlightToolbarItem() {
	return <TldrawUiMenuItem tool="highlight" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="frame" />`
 */
export function FrameToolbarItem() {
	return <TldrawUiMenuItem tool="frame" />
}

/**
 * @public
 * @react
 * @deprecated Use {@link TldrawUiMenuItem} directly: `<TldrawUiMenuItem tool="laser" />`
 */
export function LaserToolbarItem() {
	return <TldrawUiMenuItem tool="laser" />
}
