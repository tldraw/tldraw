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
export function SelectToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['select'])
	return <TldrawUiMenuItem {...tools['select']} isSelected={isSelected} />
}

/** @public */
export function HandToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['hand'])
	return <TldrawUiMenuItem {...tools['hand']} isSelected={isSelected} />
}

/** @public */
export function DrawToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['draw'])
	return <TldrawUiMenuItem {...tools['draw']} isSelected={isSelected} />
}

/** @public */
export function EraserToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['eraser'])
	return <TldrawUiMenuItem {...tools['eraser']} isSelected={isSelected} />
}

/** @public */
export function ArrowToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['arrow'])
	return <TldrawUiMenuItem {...tools['arrow']} isSelected={isSelected} />
}

/** @public */
export function TextToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['text'])
	return <TldrawUiMenuItem {...tools['text']} isSelected={isSelected} />
}

/** @public */
export function NoteToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['note'])
	return <TldrawUiMenuItem {...tools['note']} isSelected={isSelected} />
}

/** @public */
export function AssetToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['asset'])
	return <TldrawUiMenuItem {...tools['asset']} isSelected={isSelected} />
}

/** @public */
export function RectangleToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['rectangle'])
	return <TldrawUiMenuItem {...tools['rectangle']} isSelected={isSelected} />
}

/** @public */
export function EllipseToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['ellipse'])
	return <TldrawUiMenuItem {...tools['ellipse']} isSelected={isSelected} />
}

/** @public */
export function DiamondToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['diamond'])
	return <TldrawUiMenuItem {...tools['diamond']} isSelected={isSelected} />
}

/** @public */
export function TriangleToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['triangle'])
	return <TldrawUiMenuItem {...tools['triangle']} isSelected={isSelected} />
}

/** @public */
export function TrapezoidToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['trapezoid'])
	return <TldrawUiMenuItem {...tools['trapezoid']} isSelected={isSelected} />
}

/** @public */
export function RhombusToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['rhombus'])
	return <TldrawUiMenuItem {...tools['rhombus']} isSelected={isSelected} />
}

/** @public */
export function HexagonToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['hexagon'])
	return <TldrawUiMenuItem {...tools['hexagon']} isSelected={isSelected} />
}

/** @public */
export function CloudToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['cloud'])
	return <TldrawUiMenuItem {...tools['cloud']} isSelected={isSelected} />
}

/** @public */
export function PentagonToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['pentagon'])
	return <TldrawUiMenuItem {...tools['pentagon']} isSelected={isSelected} />
}

/** @public */
export function StarToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['star'])
	return <TldrawUiMenuItem {...tools['star']} isSelected={isSelected} />
}

/** @public */
export function OvalToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['oval'])
	return <TldrawUiMenuItem {...tools['oval']} isSelected={isSelected} />
}

/** @public */
export function XBoxToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['x-box'])
	return <TldrawUiMenuItem {...tools['x-box']} isSelected={isSelected} />
}

/** @public */
export function CheckBoxToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['check-box'])
	return <TldrawUiMenuItem {...tools['check-box']} isSelected={isSelected} />
}

/** @public */
export function ArrowLeftToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['arrow-left'])
	return <TldrawUiMenuItem {...tools['arrow-left']} isSelected={isSelected} />
}

/** @public */
export function ArrowUpToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['arrow-up'])
	return <TldrawUiMenuItem {...tools['arrow-up']} isSelected={isSelected} />
}

/** @public */
export function ArrowDownToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['arrow-down'])
	return <TldrawUiMenuItem {...tools['arrow-down']} isSelected={isSelected} />
}

/** @public */
export function ArrowRightToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['arrow-right'])
	return <TldrawUiMenuItem {...tools['arrow-right']} isSelected={isSelected} />
}

/** @public */
export function LineToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['line'])
	return <TldrawUiMenuItem {...tools['line']} isSelected={isSelected} />
}

/** @public */
export function HighlightToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['highlight'])
	return <TldrawUiMenuItem {...tools['highlight']} isSelected={isSelected} />
}

/** @public */
export function FrameToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['frame'])
	return <TldrawUiMenuItem {...tools['frame']} isSelected={isSelected} />
}

/** @public */
export function LaserToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['laser'])
	return <TldrawUiMenuItem {...tools['laser']} isSelected={isSelected} />
}
