import classNames from 'classnames'
import { HTMLAttributes, useLayoutEffect, useRef } from 'react'
import styles from './logo.module.css'

export function TlaLogo(props: HTMLAttributes<HTMLDivElement>) {
	const ref = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		if (!ref.current) return
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		ref.current.style.webkitMask = `url(/tldraw_sidebar_logo.svg) center 100% / 100% no-repeat`
	}, [ref])

	return (
		<span
			data-testid="tla-sidebar-logo-icon"
			role="img"
			ref={ref}
			{...props}
			style={{
				mask: `url(/tldraw_sidebar_logo.svg) center 100% / 100% no-repeat`,
				...props.style,
			}}
			aria-label="tldraw"
			className={classNames(styles.logo, props.className)}
		/>
	)
}
