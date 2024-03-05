'use client'

import { useRef } from 'react'

export default function FancyBox() {
	const rContainer = useRef<HTMLDivElement>(null)
	// const [items, setItems] = useState<number[]>([])

	// useEffect(() => {
	// 	const populate = debounce(() => {
	// 		const elm = rContainer.current
	// 		if (!elm) return

	// 		const width = elm.clientWidth
	// 		const height = elm.clientHeight

	// 		const SIZE = 32

	// 		const cols = Math.ceil(width / SIZE)
	// 		const rows = Math.ceil(height / SIZE)

	// 		const items = Array.from(Array(cols * rows)).map((_, i) => i)

	// 		setItems(items)
	// 	}, 100)

	// 	populate()

	// 	window.addEventListener('resize', populate)
	// 	return () => {
	// 		window.removeEventListener('resize', populate)
	// 	}
	// }, [])

	return (
		<div className="footer__fancybox" ref={rContainer}>
			{/* {items.map((i) => {
				const c = 1 + (i % 7)
				return <div key={i} className="footer__fancybox__item" data-c={c} />
			})} */}
		</div>
	)
}
