import React, { PropsWithChildren, useCallback, useContext, useEffect } from 'react'
import { Spinner } from 'tldraw'

/*
 * This file implements an optional 'shroud' for initial page loads to fade
 * in the page once all the necessary data has been loaded. This can help
 * avoid flickering in some situations.
 */

const ReadyContext = React.createContext({ isReady: true, setIsReady: () => {}, isRoot: true })

export function useIsReady() {
	return React.useContext(ReadyContext).isReady
}

export function useSetIsReady() {
	return React.useContext(ReadyContext).setIsReady
}

export function ReadyWrapper({ children }: PropsWithChildren) {
	const parent = useContext(ReadyContext)
	const [isReady, _setIsReady] = React.useState(false)
	const [showSpinner, setShowSpinner] = React.useState(false)
	const setIsReady = useCallback(async () => {
		_setIsReady(true)
	}, [])
	useEffect(() => {
		const timeout = setTimeout(() => {
			setShowSpinner(true)
		}, 500)
		return () => {
			clearTimeout(timeout)
		}
	}, [])
	if (!parent.isRoot) {
		// already wrapped at a higher level
		return children
	}
	return (
		<ReadyContext.Provider value={{ isReady, setIsReady, isRoot: false }}>
			<div
				style={{
					flex: 1,
					display: 'flex',
					position: 'relative',
					width: '100%',
					height: '100%',
					pointerEvents: isReady ? 'all' : 'none',
				}}
			>
				<div
					style={{
						flexGrow: 1,
						height: '100%',
						opacity: isReady ? 1 : 0,
						transition: 'opacity 0.12s ease-in',
					}}
				>
					{children}
				</div>
				{!isReady && (
					<div
						style={{
							opacity: showSpinner ? 1 : 0,
							transition: 'opacity 1s ease-in',
							position: 'absolute',
							inset: 0,
							display: 'flex',
							justifyContent: 'center',
							alignItems: 'center',
						}}
					>
						<Spinner />
					</div>
				)}
			</div>
		</ReadyContext.Provider>
	)
}
