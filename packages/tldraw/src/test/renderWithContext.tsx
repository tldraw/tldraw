import { render } from '@testing-library/react'
import * as React from 'react'
import { TldrawContext, useKeyboardShortcuts } from '~hooks'
import { TldrawApp } from '~state'
import { mockDocument } from './mockDocument'

export const Wrapper = ({ children }: { children: any }) => {
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
      <div ref={rWrapper}>{children}</div>
    </TldrawContext.Provider>
  )
}

export const renderWithContext = (children: React.ReactNode) => {
  return render(<Wrapper>{children}</Wrapper>)
}
