import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

import { MyShapeUtil } from './MyShapeUtil'

// There's a guide at the bottom of this file!

// [1]
const customShapeUtils = [MyShapeUtil]

//[2]
export default function InteractiveShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw shapeUtils={customShapeUtils} />
		</div>
	)
}

/*
By default the editor handles pointer events, but sometimes you want to handle 
interactions on your shape in your own ways, for example via a button. You can do this 
by using the css property `pointer events: all` and stopping event propagation. In 
this example we want our todo shape to have a checkbox so the user can mark them as 
done.
 */
