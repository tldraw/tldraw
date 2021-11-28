import * as React from 'react'

// Copied from https://github.com/bvaughn/react-error-boundary/blob/master/src/index.tsx
// (There's an issue with esm builds of this library, so we can't use it directly.)
const changedArray = (a: Array<unknown> = [], b: Array<unknown> = []) =>
  a.length !== b.length || a.some((item, index) => !Object.is(item, b[index]))

interface FallbackProps {
  error: Error
  resetErrorBoundary: (...args: Array<unknown>) => void
}

interface ErrorBoundaryPropsWithComponent {
  onResetKeysChange?: (
    prevResetKeys: Array<unknown> | undefined,
    resetKeys: Array<unknown> | undefined
  ) => void
  onReset?: (...args: Array<unknown>) => void
  onError?: (error: Error, info: { componentStack: string }) => void
  resetKeys?: Array<unknown>
  fallback?: never
  FallbackComponent: React.ComponentType<FallbackProps>
  fallbackRender?: never
}

declare function FallbackRender(
  props: FallbackProps
): React.ReactElement<unknown, string | React.FunctionComponent | typeof React.Component> | null

interface ErrorBoundaryPropsWithRender {
  onResetKeysChange?: (
    prevResetKeys: Array<unknown> | undefined,
    resetKeys: Array<unknown> | undefined
  ) => void
  onReset?: (...args: Array<unknown>) => void
  onError?: (error: Error, info: { componentStack: string }) => void
  resetKeys?: Array<unknown>
  fallback?: never
  FallbackComponent?: never
  fallbackRender: typeof FallbackRender
}

interface ErrorBoundaryPropsWithFallback {
  onResetKeysChange?: (
    prevResetKeys: Array<unknown> | undefined,
    resetKeys: Array<unknown> | undefined
  ) => void
  onReset?: (...args: Array<unknown>) => void
  onError?: (error: Error, info: { componentStack: string }) => void
  resetKeys?: Array<unknown>
  fallback: React.ReactElement<
    unknown,
    string | React.FunctionComponent | typeof React.Component
  > | null
  FallbackComponent?: never
  fallbackRender?: never
}

type ErrorBoundaryProps =
  | ErrorBoundaryPropsWithFallback
  | ErrorBoundaryPropsWithComponent
  | ErrorBoundaryPropsWithRender

type ErrorBoundaryState = { error: Error | null }

const initialState: ErrorBoundaryState = { error: null }

class ErrorBoundary extends React.Component<
  React.PropsWithRef<React.PropsWithChildren<ErrorBoundaryProps>>,
  ErrorBoundaryState
> {
  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  state = initialState
  updatedWithError = false
  resetErrorBoundary = (...args: Array<unknown>) => {
    this.props.onReset?.(...args)
    this.reset()
  }

  reset() {
    this.updatedWithError = false
    this.setState(initialState)
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info)
  }

  componentDidMount() {
    const { error } = this.state

    if (error !== null) {
      this.updatedWithError = true
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { error } = this.state
    const { resetKeys } = this.props

    // There's an edge case where if the thing that triggered the error
    // happens to *also* be in the resetKeys array, we'd end up resetting
    // the error boundary immediately. This would likely trigger a second
    // error to be thrown.
    // So we make sure that we don't check the resetKeys on the first call
    // of cDU after the error is set
    if (error !== null && !this.updatedWithError) {
      this.updatedWithError = true
      return
    }

    if (error !== null && changedArray(prevProps.resetKeys, resetKeys)) {
      this.props.onResetKeysChange?.(prevProps.resetKeys, resetKeys)
      this.reset()
    }
  }

  render() {
    const { error } = this.state

    const { fallbackRender, FallbackComponent, fallback } = this.props

    if (error !== null) {
      const props = {
        error,
        resetErrorBoundary: this.resetErrorBoundary,
      }
      if (React.isValidElement(fallback)) {
        return fallback
      } else if (typeof fallbackRender === 'function') {
        return fallbackRender(props)
      } else if (FallbackComponent) {
        return <FallbackComponent {...props} />
      } else {
        throw new Error(
          'react-error-boundary requires either a fallback, fallbackRender, or FallbackComponent prop'
        )
      }
    }

    return this.props.children
  }
}

export { ErrorBoundary }
export type {
  FallbackProps,
  ErrorBoundaryPropsWithComponent,
  ErrorBoundaryPropsWithRender,
  ErrorBoundaryPropsWithFallback,
  ErrorBoundaryProps,
}
