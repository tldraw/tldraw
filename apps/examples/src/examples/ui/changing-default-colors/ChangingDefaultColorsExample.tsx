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
					const def = editor.getThemeDefinition('default')!
					editor.setThemeDefinition('default', {
						...def,
						colors: {
							...def.colors,
							light: {
								...def.colors.light,
								black: {
									...def.colors.light.black,
									solid: 'aqua',
								},
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
Use editor.setThemeDefinition() to customize a theme's color palette.
This replaces the theme definition, so spread the existing definition
and only override the colors you want to change.

Remember that you can't add or remove colors here yet. These colors are
used by our default shapes and we need to make sure that we don't end
up with a color that we can't handle, or else this could get propagated
to other users in a multiplayer session.

At the moment, if you want to create new colors, you will need to create
your own shapes that understand those colors. We're working on making
this easier!
*/
