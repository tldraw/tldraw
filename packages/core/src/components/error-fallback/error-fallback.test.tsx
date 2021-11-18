import * as React from 'react'
import { renderWithContext } from '~test'
import { ErrorFallback } from './error-fallback'

describe('error fallback', () => {
  test('mounts component without crashing', () => {
    renderWithContext(<ErrorFallback error={new Error()} resetErrorBoundary={() => void null} />)
  })
})
