import { Tldraw, extendDefaultColorTheme } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
extendDefaultColorTheme((themes) => {
	return {
		...themes,
		light: {
			...themes.light,
			colors: {
				...themes.light.colors,
				aqua: {
					solid: '#22d3ee',
					fill: '#22d3ee',
					frameHeadingStroke: '#5bdcf4',
					frameHeadingFill: '#f4fdff',
					frameStroke: '#5bdcf4',
					frameFill: '#f8fdff',
					frameText: '#000000',
					noteFill: '#a6ecf8',
					noteText: '#000000',
					semi: '#d9f7fb',
					pattern: '#5cd5e8',
					highlightSrgb: '#00f4ff',
					highlightP3: 'color(display-p3 0.1512 0.9414 0.9996)',
				},
			},
		},
		dark: {
			...themes.dark,
			colors: {
				...themes.dark.colors,
				aqua: {
					solid: '#22d3ee',
					fill: '#22d3ee',
					frameHeadingStroke: '#0a4d57',
					frameHeadingFill: '#142a2f',
					frameStroke: '#0a4d57',
					frameFill: '#0c1719',
					frameText: '#f2f2f2',
					noteFill: '#0f3f49',
					noteText: '#f2f2f2',
					semi: '#24363a',
					pattern: '#3a8792',
					highlightSrgb: '#00bdc8',
					highlightP3: 'color(display-p3 0.0023 0.7259 0.7735)',
				},
			},
		},
	}
})

export default function CustomColors2Example() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					if (editor.getCurrentPageShapes().length > 0) return

					editor.createShapes([
						{
							type: 'note',
							x: 100,
							y: 100,
							props: { color: 'aqua' },
						},
						{
							type: 'geo',
							x: 400,
							y: 0,
							props: {
								geo: 'ellipse',
								fill: 'solid',
								color: 'aqua',
							},
						},
						{
							type: 'geo',
							x: 600,
							y: 0,
							props: {
								fill: 'pattern',
								color: 'aqua',
							},
						},
					])
				}}
			/>
		</div>
	)
}

/*

[1]
You can use the `extendDefaultColorTheme` function to extend the default color theme with new colors.
This function takes a function that receives the current default color theme and returns a new default color theme.
The new color theme is merged with the current default color theme, and the new colors are added to the style values.
*/
