import * as React from 'react'
import { render } from 'react-dom'
import { App } from './app'

render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('app')
)

if (import.meta.hot) {
  import.meta.hot.accept()
}
