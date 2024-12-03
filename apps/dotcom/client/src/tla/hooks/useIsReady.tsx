import classNames from 'classnames'
import React, { PropsWithChildren, useCallback, useContext, useEffect } from 'react'
import { Spinner } from 'tldraw'
import styles from './useIsReady.module.css'

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
			<div className={classNames(styles.container, isReady && styles.isReady)}>
				<div className={classNames(styles.innerContainer, isReady && styles.isReady)}>
					{children}
				</div>
				{!isReady && (
					<div className={classNames(styles.spinner, showSpinner && styles.showSpinner)}>
						<Spinner />
					</div>
				)}
			</div>
		</ReadyContext.Provider>
	)
}
