import * as React from 'react'
import { renderWithContext } from '+test-utils'
import { ErrorFallback } from './error-fallback'

describe('error fallback', () => {
  test('mounts component', () => {
    renderWithContext(<ErrorFallback error={new Error()} resetErrorBoundary={() => void null} />)
  })
})
