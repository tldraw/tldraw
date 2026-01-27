import React from 'react'

/**
 * Discriminated union for shape fill props.
 * Each fill type has exactly the props it needs - no invalid states.
 *
 * @internal
 */
export type ShapeFillProps =
	| { d: string; type: 'none' }
	| { d: string; type: 'solid'; color: string; opacity?: number }
	| { d: string; type: 'pattern'; color: string; patternUrl: string; opacity?: number }

/**
 * Low-level shape fill component with fully resolved props.
 * No hooks or theme lookups - all values must be pre-computed by the caller.
 *
 * @internal
 */
export const ShapeFill = React.memo(function ShapeFill(props: ShapeFillProps) {
	switch (props.type) {
		case 'none':
			return null
		case 'solid':
			return <path fill={props.color} fillOpacity={props.opacity} d={props.d} />
		case 'pattern':
			return (
				<>
					<path fill={props.color} fillOpacity={props.opacity} d={props.d} />
					<path fill={`url(#${props.patternUrl})`} fillOpacity={props.opacity} d={props.d} />
				</>
			)
	}
})
