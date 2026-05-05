import { Tldraw, type TLEditorComponents } from 'tldraw'

function MyBrush() {
	return null
}
function MyScribble() {
	return null
}
function MySelectionForeground() {
	return null
}
function MySelectionBackground() {
	return null
}

// Should not fire any slot flags — these keys live on an unrelated object
const myOptions = {
	Brush: 'unrelated',
	Scribble: 'should-not-fire',
}

export function Overlays() {
	const _ = myOptions.Brush
	return (
		<Tldraw
			components={{
				Brush: MyBrush,
				Scribble: MyScribble,
				SelectionForeground: MySelectionForeground,
				SelectionBackground: MySelectionBackground,
			}}
		/>
	)
}
