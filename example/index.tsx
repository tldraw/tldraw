import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { TLDraw } from '@tldraw/tldraw'

const App = () => {
  return <TLDraw />
}

ReactDOM.render(<App />, document.getElementById('root'))
