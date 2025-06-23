import { useLayoutEffect, useRef } from 'react'
import styles from './logo.module.css'

export function TlaLogo() {
	const ref = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		if (!ref.current) return
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		ref.current.style.webkitMask = `url(/tldraw_sidebar_logo.svg) center 100% / 100% no-repeat`
	}, [ref])

	return (
		<span
			ref={ref}
			aria-hidden="true"
			className={styles.logo}
			role="img"
			style={{
				mask: `url(/tldraw_sidebar_logo.svg) center 100% / 100% no-repeat`,
			}}
		/>
	)
}
