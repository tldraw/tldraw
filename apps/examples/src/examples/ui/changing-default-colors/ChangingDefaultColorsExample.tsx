import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

export default function ChangingDefaultColorsExample() {
	return (
		<div className="tldraw__editor">
			{/* [1] */}
			<Tldraw
				persistenceKey="changing-default-colors-example"
				onMount={(editor) => {
					const theme = editor.getTheme('default')!
					editor.updateTheme({
						...theme,
						colors: {
							...theme.colors,
							light: {
								...theme.colors.light,
								black: { ...theme.colors.light.black, solid: 'aqua' },
							},
						},
					})
				}}
			/>
		</div>
	)
}

/*
[1]
Use `editor.updateTheme()` to change a theme's color palette. Get the current
theme with `editor.getTheme()`, copy it with the values you want changed, and
pass it back. Here we make the "black" color's solid value aqua in light mode.

Changing values this way keeps the set of color names the same, so existing
shapes (and other users in a multiplayer session) keep working. To add or
remove colors, or register additional named themes, see the custom theme and
multiple themes examples.
*/
