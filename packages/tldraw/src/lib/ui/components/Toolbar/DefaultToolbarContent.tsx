import { useTools } from '../../hooks/useTools'
import { TldrawUiToolbarButton } from './TldrawUiToolbarButton'

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

/** @public */
export function SelectToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['select']} />
}

/** @public */
export function HandToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['hand']} />
}

/** @public */
export function DrawToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['draw']} />
}

/** @public */
export function EraserToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['eraser']} />
}

/** @public */
export function ArrowToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['arrow']} />
}

/** @public */
export function TextToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['text']} />
}

/** @public */
export function NoteToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['note']} />
}

/** @public */
export function AssetToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['asset']} />
}

/** @public */
export function RectangleToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['rectangle']} />
}

/** @public */
export function EllipseToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['ellipse']} />
}

/** @public */
export function DiamondToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['diamond']} />
}

/** @public */
export function TriangleToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['triangle']} />
}

/** @public */
export function TrapezoidToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['trapezoid']} />
}

/** @public */
export function RhombusToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['rhombus']} />
}

/** @public */
export function HexagonToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['hexagon']} />
}

/** @public */
export function CloudToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['cloud']} />
}

/** @public */
export function StarToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['star']} />
}

/** @public */
export function OvalToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['oval']} />
}

/** @public */
export function XBoxToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['x-box']} />
}

/** @public */
export function CheckBoxToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['check-box']} />
}

/** @public */
export function ArrowLeftToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['arrow-left']} />
}

/** @public */
export function ArrowUpToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['arrow-up']} />
}

/** @public */
export function ArrowDownToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['arrow-down']} />
}

/** @public */
export function ArrowRightToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['arrow-right']} />
}

/** @public */
export function LineToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['line']} />
}

/** @public */
export function HighlightToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['highlight']} />
}

/** @public */
export function FrameToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['frame']} />
}

/** @public */
export function LaserToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['laser']} />
}
