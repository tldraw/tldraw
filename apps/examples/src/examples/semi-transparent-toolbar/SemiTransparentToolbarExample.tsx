import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import './semi-transparent-toolbar.css'

export default function SemiTransparentToolbarExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="semi-transparent-toolbar-example"
				className="semi-transparent-toolbar"
			/>
		</div>
	)
}

/* 
This example shows how to make the toolbar semi-transparent by applying custom CSS.

The key techniques used:
1. Override the background-color of the toolbar elements with rgba() values for transparency
2. Add backdrop-filter: blur() for a frosted glass effect
3. Adjust border colors to be semi-transparent as well
4. Handle both light and dark themes
5. Ensure hover effects remain visible and accessible

The toolbar maintains full functionality while allowing the canvas content to show through.
This can create a more immersive editing experience, especially useful when working with 
background images or when you want the toolbar to feel less obtrusive.

CSS selectors target:
- .tlui-toolbar__tools: The main toolbar container
- .tlui-toolbar__extras__controls: The extra controls (actions menu, etc.)
- Different styles for .tl-theme__dark to handle dark mode appropriately
*/
