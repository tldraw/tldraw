import * as React from 'react'
import { render } from '@testing-library/react'
import { ContextWrapper } from './context-wrapper'

export const renderWithContext = (children: JSX.Element) => {
  return render(<ContextWrapper>{children}</ContextWrapper>)
}
