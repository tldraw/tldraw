import { render } from '@testing-library/react'
import * as React from 'react'
import { ContextWrapper } from './ContextWrapper'

export const renderWithSvg = (children: React.ReactNode) => {
  return render(
    <ContextWrapper>
      <svg>{children}</svg>
    </ContextWrapper>
  )
}
