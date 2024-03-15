import { DefaultColorThemePalette, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
DefaultColorThemePalette.lightMode.black.solid = 'aqua'

export default function ChangingDefaultColorsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="example" />
		</div>
	)
}

/*

[1]
The default color theme is exported from the tldraw library. You can 
modify it directly outside of the React lifecycle, so that your changes
are used when the component mounts.

Remember that you can't add or remove colors here yet. These colors are
used by our default shapes and we need to make sure that we don't end
up with a color that we can't handle, or else this could get propagated
to other users in a multiplayer session.

At the moment, if you want to create new colors, you will need to create 
your own shapes that understand those colors. We're working on making 
this easier!
*/
