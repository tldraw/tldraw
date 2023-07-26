import * as React from 'react'
import { RequiredKeys } from '../editor/types/misc-types'
import { TLErrorFallbackComponent } from './default-components/DefaultErrorFallback'

/** @public */
export interface TLErrorBoundaryProps {
	children: any
	onError?: ((error: unknown) => void) | null
	fallback: TLErrorFallbackComponent
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

	override state = initialState

	override componentDidCatch(error: unknown) {
		this.props.onError?.(error)
	}

	override render() {
		const { error } = this.state

		if (error !== null) {
			const { fallback: Fallback } = this.props
			return <Fallback error={error} />
		}

		return this.props.children
	}
}

/** @internal */
export const OptionalErrorBoundary: React.ComponentType<
	RequiredKeys<TLErrorBoundaryProps, 'fallback'>
> = ({ children, fallback, ...props }) => {
	if (fallback === null) {
		return children
	}

	return (
		<ErrorBoundary fallback={fallback as any} {...props}>
			{children}
		</ErrorBoundary>
	)
}
