export const heroDemoCodeSnippet = `import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function App() {
  return (
    <div className="editor">
      <Tldraw
        onMount={(editor) => {
          editor.selectAll()
        }}
      />
    </div>
  )
}`
