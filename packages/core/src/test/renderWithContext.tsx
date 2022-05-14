import * as React from 'react'
import { render } from '@testing-library/react'
import { ContextWrapper } from './ContextWrapper'

export const renderWithContext = (children: React.ReactNode) => {
  return render(<ContextWrapper>{children}</ContextWrapper>)
}
