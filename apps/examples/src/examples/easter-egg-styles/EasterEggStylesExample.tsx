import { Editor, Tldraw, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'

export default function EasterEggStylesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor: Editor) => {
					editor.createShapes([
						{
							type: 'geo',
							x: 0,
							y: 0,
							props: {
								geo: 'rectangle',
								w: 250,
								h: 250,
								color: 'blue',
								fill: 'fill', // Easter egg: Fill style (keyboard shortcut: Option+F)
								richText: toRichText('Fill\n(Option+F)'),
							},
						},
						{
							type: 'geo',
							x: 300,
							y: 0,
							props: {
								geo: 'rectangle',
								w: 250,
								h: 250,
								color: 'blue',
								fill: 'lined-fill', // Easter egg: Lined fill style (keyboard shortcut: Option+Shift+F)
								richText: toRichText('Lined fill\n(Option+Shift+F)'),
							},
						},
						{
							type: 'geo',
							x: 600,
							y: 0,
							props: {
								geo: 'rectangle',
								w: 250,
								h: 250,
								color: 'white', // Easter egg: White color (keyboard shortcut: Option+T)
								fill: 'fill',
								richText: toRichText('White \n(Option+T)'),
							},
						},
						{
							type: 'geo',
							x: 900,
							y: 0,
							props: {
								geo: 'rectangle',
								w: 250,
								h: 250,
								color: 'blue',
								richText: toRichText('Label color'),
								labelColor: 'red', // Separate label color
							},
						},
						{
							type: 'geo',
							x: 1200,
							y: 0,
							props: {
								geo: 'rectangle',
								w: 250,
								h: 250,
								color: 'blue',
								scale: 2.5,
								richText: toRichText('Scale'), // Scale (available via the Dynamic size preference)
							},
						},
					])

					editor.zoomToFit()
				}}
			/>
		</div>
	)
}
