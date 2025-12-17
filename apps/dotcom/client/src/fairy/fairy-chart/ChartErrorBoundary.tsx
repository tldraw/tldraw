/**
 * Error boundary component for chart rendering failures
 *
 * Catches and handles errors that occur during chart rendering,
 * preventing the entire app from crashing if a chart fails.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ChartErrorBoundaryProps {
	children: ReactNode
	fallback?: ReactNode
}

interface ChartErrorBoundaryState {
	hasError: boolean
	error: Error | null
}

export class ChartErrorBoundary extends Component<
	ChartErrorBoundaryProps,
	ChartErrorBoundaryState
> {
	constructor(props: ChartErrorBoundaryProps) {
		super(props)
		this.state = { hasError: false, error: null }
	}

	static getDerivedStateFromError(error: Error): ChartErrorBoundaryState {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error('Chart rendering error:', error, errorInfo)
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback
			}

			return (
				<div className="fairy-activity-chart-error">
					<p>Unable to render chart</p>
				</div>
			)
		}

		return this.props.children
	}
}
