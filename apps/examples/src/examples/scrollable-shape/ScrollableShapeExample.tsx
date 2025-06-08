import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { ScrollableShapeUtil } from './ScrollableShapeUtil'

const customShapeUtils = [ScrollableShapeUtil]

export default function ScrollableShapeExample() {
  return (
    <div className="tldraw__editor">
      <Tldraw
        shapeUtils={customShapeUtils}
        onMount={(editor) => {
          editor.createShape({ type: 'scrollable-shape', x: 100, y: 100 })
        }}
      />
    </div>
  )
}
