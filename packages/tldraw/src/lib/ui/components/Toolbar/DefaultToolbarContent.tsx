import { useTools } from '../../hooks/useTools'
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

export function SelectToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['select']} />
}

export function HandToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['hand']} />
}

export function DrawToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['draw']} />
}

export function EraserToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['eraser']} />
}

export function ArrowToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['arrow']} />
}

export function TextToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['text']} />
}

export function NoteToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['note']} />
}

export function AssetToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['asset']} />
}

export function RectangleToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['rectangle']} />
}

export function EllipseToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['ellipse']} />
}

export function DiamondToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['diamond']} />
}

export function TriangleToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['triangle']} />
}

export function TrapezoidToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['trapezoid']} />
}

export function RhombusToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['rhombus']} />
}

export function HexagonToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['hexagon']} />
}

export function CloudToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['cloud']} />
}

export function StarToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['star']} />
}

export function OvalToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['oval']} />
}

export function XBoxToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['xBox']} />
}

export function CheckBoxToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['checkBox']} />
}

export function ArrowLeftToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['arrowLeft']} />
}

export function ArrowUpToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['arrowUp']} />
}

export function ArrowDownToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['arrowDown']} />
}

export function ArrowRightToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['arrowRight']} />
}

export function LineToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['line']} />
}

export function HighlightToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['highlight']} />
}

export function FrameToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['frame']} />
}

export function LaserToolbarItem() {
	const tools = useTools()
	return <TldrawUiToolbarButton {...tools['laser']} />
}
