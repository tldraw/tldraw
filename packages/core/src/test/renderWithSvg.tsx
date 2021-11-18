import * as React from 'react'
import { render } from '@testing-library/react'
import { ContextWrapper } from './context-wrapper'

export const renderWithSvg = (children: JSX.Element) => {
  return render(
    <ContextWrapper>
      <svg>{children}</svg>
    </ContextWrapper>
  )
}
