import * as React from 'react'
import Editor from './components/editor'

export default function Embedded(): JSX.Element {
  return (
    <div>
      <div
        style={{
          position: 'relative',
          margin: '5%',
          width: 'calc(100% - 100px)',
          height: '500px',
        }}
      >
        <Editor id="small1" />
      </div>

      <div
        style={{
          position: 'relative',
          margin: '5%',
          width: 'calc(100% - 100px)',
          height: '500px',
        }}
      >
        <Editor id="small2" />
      </div>
    </div>
  )
}
