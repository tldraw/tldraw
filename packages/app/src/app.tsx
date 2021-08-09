import * as React from 'react'
import Editor from './components/editor'

type AppProps = {}

export const App: React.FC<AppProps> = props => {
  return (
    <div>
      <Editor />
    </div>
  )
}
