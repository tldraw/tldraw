import * as React from 'react'
import { IdProvider } from '@radix-ui/react-id'
import { TldrawApp } from '~state'
import { useKeyboardShortcuts, TldrawContext } from '~hooks'
import { mockDocument } from './mockDocument'
import { render } from '@testing-library/react'

export const Wrapper: React.FC = ({ children }) => {
  const [app] = React.useState(() => new TldrawApp())
  const [context] = React.useState(() => {
    return app
  })

  const rWrapper = React.useRef<HTMLDivElement>(null)

  useKeyboardShortcuts(rWrapper)

  React.useEffect(() => {
    if (!document) return
    app.loadDocument(mockDocument)
  }, [document, app])

  return (
    <TldrawContext.Provider value={context}>
      <IdProvider>
        <div ref={rWrapper}>{children}</div>
      </IdProvider>
    </TldrawContext.Provider>
  )
}

export const renderWithContext = (children: JSX.Element) => {
  return render(<Wrapper>{children}</Wrapper>)
}
