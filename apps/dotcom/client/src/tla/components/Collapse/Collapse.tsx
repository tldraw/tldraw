import React, { useLayoutEffect, useRef, useState } from 'react'
import styles from './Collapse.module.css'

interface CollapseProps {
	open: boolean
	children: React.ReactNode
}

export function Collapse({ open, children }: CollapseProps) {
	const [isMounted, setIsMounted] = useState(open)
	const [isOpen, setIsOpen] = useState(open)
	const wrapperRef = useRef<HTMLDivElement>(null)

	const onTransitionEnd = useRef<() => void>(() => {})

	useLayoutEffect(() => {
		if (open && !isOpen) {
			if (!isMounted) {
				setIsMounted(true)
			} else {
				// we are mounted let's measure and animate
				const element = wrapperRef.current!
				const targetHeight = element.scrollHeight // use scrollHeight to get the height of the content
				element.style.height = '0px'
				requestAnimationFrame(() => {
					element.style.height = `${targetHeight}px`
					// duration between 150ms and 350ms based on the height of the content
					element.style.transitionDuration = `${150 + Math.min(targetHeight / 800, 1) * 200}ms`
					setIsOpen(true)
					onTransitionEnd.current = () => {
						// when we are done animating, we can set the height to auto
						// so it grows/shrinks if the content changes
						element.style.height = 'auto'
					}
				})
			}
		} else if (!open && isOpen) {
			// we are mounted and open, take us back down to 0
			const element = wrapperRef.current!
			const currentHeight = element.offsetHeight // use offsetHeight to get the current actual height
			element.style.height = `${currentHeight}px`
			// duration between 150ms and 350ms based on the height of the content
			element.style.transitionDuration = `${150 + Math.min(currentHeight / 800, 1) * 200}ms`
			requestAnimationFrame(() => {
				element.style.height = '0px'
				onTransitionEnd.current = () => {
					setIsOpen(false)
					setIsMounted(false)
				}
			})
		}
	}, [open, isMounted, isOpen])

	if (!isMounted) return null

	return (
		<div
			ref={wrapperRef}
			onTransitionEnd={() => onTransitionEnd.current()}
			className={styles.collapse}
		>
			{children}
		</div>
	)
}
