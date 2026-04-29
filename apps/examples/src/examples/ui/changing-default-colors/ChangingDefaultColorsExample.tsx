import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

export default function ChangingDefaultColorsExample() {
	return (
		<div className="tldraw__editor">
			{/* [1] */}
			<Tldraw
				persistenceKey="example"
				onMount={(editor) => {
					const theme = { ...editor.getTheme('default')! }
					theme.colors = {
						...theme.colors,
						light: { ...theme.colors.light, black: { ...theme.colors.light.black, solid: 'aqua' } },
					}
					editor.updateTheme(theme)
				}}
			/>
		</div>
	)
}

/*

[1]
Use editor.updateTheme() to customize a theme's color palette.
Get the current theme with editor.getTheme(), modify it, and pass it back.

Remember that you can't add or remove colors here yet. These colors are
used by our default shapes and we need to make sure that we don't end
up with a color that we can't handle, or else this could get propagated
to other users in a multiplayer session.

At the moment, if you want to create new colors, you will need to create
your own shapes that understand those colors. We're working on making
this easier!
*/
