import * as React from 'react'

/** @public */
export interface TLErrorBoundaryProps {
	children: React.ReactNode
	onError?: ((error: unknown) => void) | null
	fallback: (error: unknown) => React.ReactNode
}

type TLErrorBoundaryState = { error: Error | null }

const initialState: TLErrorBoundaryState = { error: null }

/** @public */
export class ErrorBoundary extends React.Component<
	React.PropsWithRef<React.PropsWithChildren<TLErrorBoundaryProps>>,
	TLErrorBoundaryState
> {
	static getDerivedStateFromError(error: Error) {
		return { error }
	}

	state = initialState

	componentDidCatch(error: unknown) {
		this.props.onError?.(error)
	}

	render() {
		const { error } = this.state

		if (error !== null) {
			return this.props.fallback(error)
		}

		return this.props.children
	}
}

/** @internal */
export function OptionalErrorBoundary({
	children,
	fallback,
	...props
}: Omit<TLErrorBoundaryProps, 'fallback'> & {
	fallback: ((error: unknown) => React.ReactNode) | null
}) {
	if (fallback === null) {
		return <>{children}</>
	}

	return (
		<ErrorBoundary fallback={fallback} {...props}>
			{children}
		</ErrorBoundary>
	)
}
