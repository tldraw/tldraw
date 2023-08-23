import { track, useEditor } from '@tldraw/tldraw'
import { MyFilterStyle } from './CardShape'

export const FilterStyleUi = track(function FilterStyleUi() {
	const editor = useEditor()
	const filterStyle = editor.sharedStyles.get(MyFilterStyle)

	// if the filter style isn't in sharedStyles, it means it's not relevant to the current tool/selection
	if (!filterStyle) return null

	return (
		<div style={{ position: 'absolute', zIndex: 300, top: 64, left: 12 }}>
			filter:{' '}
			<select
				value={filterStyle.type === 'mixed' ? 'mixed' : filterStyle.value}
				onChange={(e) => {
					editor.batch(() => {
						if (editor.isIn('select')) {
							editor.setStyleForSelectedShapes(MyFilterStyle, e.target.value)
						}
						editor.setStyleForNextShapes(MyFilterStyle, e.target.value)
					})
				}}
			>
				<option value="mixed" disabled>
					Mixed
				</option>
				<option value="none">None</option>
				<option value="invert">Invert</option>
				<option value="grayscale">Grayscale</option>
				<option value="blur">Blur</option>
			</select>
		</div>
	)
})
