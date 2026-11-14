import classNames from 'classnames'
import React, { PropsWithChildren, useCallback, useContext } from 'react'
import { ReadyContext } from './useIsReady'
import styles from './useIsReady.module.css'

export function ReadyWrapper({ children }: PropsWithChildren) {
	const parent = useContext(ReadyContext)
	const [isReady, _setIsReady] = React.useState(false)
	const setIsReady = useCallback(() => _setIsReady(true), [])

	if (!parent.isRoot) {
		// already wrapped at a higher level
		return children
	}

	return (
		<ReadyContext.Provider value={{ isReady, setIsReady, isRoot: false }}>
			<div className={classNames(styles.container, isReady && styles.isReady)}>
				<div
					className={classNames(styles.innerContainer, isReady && styles.isReady)}
					inert={!isReady}
				>
					{children}
				</div>
			</div>
		</ReadyContext.Provider>
	)
}
