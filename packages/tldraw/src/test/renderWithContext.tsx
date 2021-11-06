import * as React from 'react'
import { IdProvider } from '@radix-ui/react-id'
import { TLDrawState } from '~state'
import { useKeyboardShortcuts, TLDrawContext } from '~hooks'
import { mockDocument } from './mockDocument'
import { render } from '@testing-library/react'

export const Wrapper: React.FC = ({ children }) => {
  const [tlstate] = React.useState(() => new TLDrawState())
  const [context] = React.useState(() => {
    return { tlstate, useSelector: tlstate.useStore, callbacks: {} }
  })

  const rWrapper = React.useRef<HTMLDivElement>(null)

  useKeyboardShortcuts(rWrapper)

  React.useEffect(() => {
    if (!document) return
    tlstate.loadDocument(mockDocument)
  }, [document, tlstate])

  return (
    <TLDrawContext.Provider value={context}>
      <IdProvider>
        <div ref={rWrapper}>{children}</div>
      </IdProvider>
    </TLDrawContext.Provider>
  )
}

export const renderWithContext = (children: JSX.Element) => {
  return render(<Wrapper>{children}</Wrapper>)
}
