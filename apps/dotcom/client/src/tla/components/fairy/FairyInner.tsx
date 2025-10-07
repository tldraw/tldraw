import { useEffect, useRef, useState } from 'react'
import { useEditor, useValue } from 'tldraw'

interface FairyDust {
	id: number
	x: number
	y: number
	size: number
	life: number
	vx: number
	vy: number
}

export default function FairyInner() {
	const editor = useEditor()
	const containerRef = useRef<HTMLDivElement>(null)
	const fairyRef = useRef<HTMLDivElement>(null)

	// Initialize position in page space
	const initialViewport = editor.getViewportPageBounds()
	const [position, setPosition] = useState({
		x: initialViewport.center.x,
		y: initialViewport.center.y,
	})
	const [targetPosition, setTargetPosition] = useState({
		x: initialViewport.center.x,
		y: initialViewport.center.y,
	})
	const [fairyDust, setFairyDust] = useState<FairyDust[]>([])
	const [isSelected, setIsSelected] = useState(false)
	const [isMoving, setIsMoving] = useState(false)
	const dustIdRef = useRef(0)

	// Track viewport screen bounds to position fairy correctly
	const screenPosition = useValue(
		'fairy screen position',
		() => {
			// Convert page coordinates to screen coordinates
			const screenPos = editor.pageToScreen(position)
			const screenBounds = editor.getViewportScreenBounds()
			return {
				x: screenPos.x - screenBounds.x,
				y: screenPos.y - screenBounds.y,
			}
		},
		[editor, position]
	)

	useEffect(() => {
		// Generate new whimsical target positions in page space
		const moveToNewPosition = () => {
			const viewport = editor.getViewportPageBounds()
			const margin = 200 // Keep fairy away from edges in page space

			const newX = viewport.x + margin + Math.random() * (viewport.width - margin * 2)
			const newY = viewport.y + margin + Math.random() * (viewport.height - margin * 2)

			setIsMoving(true)
			setTargetPosition({ x: newX, y: newY })

			// Mark as arrived after 2 seconds (animation duration)
			setTimeout(() => {
				setIsMoving(false)
			}, 2000)

			// Schedule next movement with random joyful timing
			const nextMove = 1500 + Math.random() * 10000
			setTimeout(moveToNewPosition, nextMove)
		}

		moveToNewPosition()
	}, [editor])

	useEffect(() => {
		// Smoothly animate towards target with whimsical easing
		let animationFrame: number

		const animate = () => {
			setPosition((current) => {
				const dx = targetPosition.x - current.x
				const dy = targetPosition.y - current.y
				const distance = Math.sqrt(dx * dx + dy * dy)

				if (distance < 1) return current

				// Add some flutter to the movement
				const flutter = Math.sin(Date.now() * 0.01) * 3
				const ease = 0.8 // Smooth easing factor

				return {
					x: current.x + dx * ease + flutter,
					y: current.y + dy * ease + Math.cos(Date.now() * 0.008) * 2,
				}
			})

			animationFrame = requestAnimationFrame(animate)
		}

		animationFrame = requestAnimationFrame(animate)

		return () => cancelAnimationFrame(animationFrame)
	}, [targetPosition])

	useEffect(() => {
		// Sprinkle fairy dust only when fairy has arrived (not moving)
		if (isMoving) return

		const dustInterval = setInterval(() => {
			const newDust: FairyDust = {
				id: dustIdRef.current++,
				x: screenPosition.x - 32,
				y: screenPosition.y,
				size: 2 + Math.random() * 0.75,
				life: 1,
				vx: (Math.random() - 0.5) * 0.7,
				vy: -1,
			}
			setFairyDust((prev) => [...prev, newDust])
		}, 50)

		return () => clearInterval(dustInterval)
	}, [screenPosition, isMoving])

	useEffect(() => {
		// Animate fairy dust particles
		const dustAnimation = setInterval(() => {
			setFairyDust((prev) =>
				prev
					.map((dust) => ({
						...dust,
						x: dust.x + dust.vx,
						y: dust.y + dust.vy,
						life: dust.life - 0.01,
						vy: dust.vy + 0.1, // Gravity effect
					}))
					.filter((dust) => dust.life > 0)
			)
		}, 16)

		return () => clearInterval(dustAnimation)
	}, [])

	useEffect(() => {
		// Deselect fairy when clicking outside
		const handleClickOutside = (e: any) => {
			if (fairyRef.current && !fairyRef.current.contains(e.target)) {
				setIsSelected(false)
			}
		}

		if (isSelected) {
			document.addEventListener('mousedown', handleClickOutside)
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isSelected])

	const handleFairyClick = (e: any) => {
		e.stopPropagation()
		setIsSelected((prev) => !prev)
	}

	return (
		<div
			ref={containerRef}
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				width: '100vw',
				height: '100vh',
				pointerEvents: 'none',
				zIndex: 9999,
				overflow: 'hidden',
			}}
		>
			{/* Fairy */}
			<div
				ref={fairyRef}
				style={{
					position: 'absolute',
					left: screenPosition.x,
					top: screenPosition.y,
					transform: 'translate(-50%, -50%)',
					transition: 'transform 0.15s ease-out, left 1.5s ease-out, top 1.5s ease-out',
					animation: 'fairy-bob 0.8s ease-in-out infinite',
					pointerEvents: 'auto',
					cursor: 'pointer',
				}}
				onClick={handleFairyClick}
			>
				{/* Selection corner brackets */}
				{isSelected && (
					<div
						style={{
							position: 'absolute',
							left: '50%',
							top: '50%',
							transform: 'translate(-50%, -50%)',
							width: '64px',
							height: '64px',
							pointerEvents: 'none',
						}}
					>
						{/* Top-left corner */}
						<div
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								width: '10px',
								height: '10px',
								borderTop: '3px solid #4ba1f1',
								borderLeft: '3px solid #4ba1f1',
							}}
						/>
						{/* Top-right corner */}
						<div
							style={{
								position: 'absolute',
								top: 0,
								right: 0,
								width: '10px',
								height: '10px',
								borderTop: '3px solid #4ba1f1',
								borderRight: '3px solid #4ba1f1',
							}}
						/>
						{/* Bottom-left corner */}
						<div
							style={{
								position: 'absolute',
								bottom: 0,
								left: 0,
								width: '10px',
								height: '10px',
								borderBottom: '3px solid #4ba1f1',
								borderLeft: '3px solid #4ba1f1',
							}}
						/>
						{/* Bottom-right corner */}
						<div
							style={{
								position: 'absolute',
								bottom: 0,
								right: 0,
								width: '10px',
								height: '10px',
								borderBottom: '3px solid #4ba1f1',
								borderRight: '3px solid #4ba1f1',
							}}
						/>
					</div>
				)}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="80"
					height="80"
					viewBox="655 255 137 143"
					style={{
						filter: 'drop-shadow(0 0 8px rgba(75, 161, 241, 0.5))',
					}}
				>
					<g transform="matrix(1, 0, 0, 1, 711.6021, 318.775)" opacity="1">
						<path fill="#fcfffe" d="M 0 0 L 22.3438 0 L 22.3438 30.8203 L 0 30.8203 Z" />
						<g strokeWidth="2" fill="none" stroke="#4ba1f1">
							<path
								d="M 0 0 L 22.3438 0"
								strokeDasharray="4.390625 6.5859375"
								strokeDashoffset="2"
							/>
							<path
								d="M 22.3438 0 L 22.3438 30.8203"
								strokeDasharray="4.3525390625 5.803385416666667"
								strokeDashoffset="2"
							/>
							<path
								d="M 22.3438 30.8203 L 0 30.8203"
								strokeDasharray="4.390625 6.5859375"
								strokeDashoffset="2"
							/>
							<path
								d="M 0 30.8203 L 0 0"
								strokeDasharray="4.3525390625 5.803385416666667"
								strokeDashoffset="2"
							/>
						</g>
					</g>
					{/* Wings */}
					<g transform="matrix(1, 0, 0, 1, 736.3635, 319.0867)" opacity="1">
						<g transform="scale(1)">
							<path
								d="M0,0 Q1.1263,-0.8482 1.5672,-1.1701 T2.3574,-1.7355 3.0129,-2.1981 3.5884,-2.6162 4.0839,-2.9736 4.5358,-3.2843 4.9823,-3.5742 5.4168,-3.8413 5.84,-4.0824 6.2732,-4.2979 6.7278,-4.5132 7.1802,-4.7375 7.6316,-4.9803 8.1142,-5.2378 8.6116,-5.4782 9.1102,-5.7116 9.6391,-5.9594 10.2141,-6.2196 10.8141,-6.4751 11.4142,-6.7122 12.0096,-6.9346 12.5821,-7.1309 13.1215,-7.2969 13.6384,-7.4328 14.1202,-7.5341 14.5579,-7.6121 14.9556,-7.6658 15.311,-7.6951 15.6571,-7.711 16.0027,-7.7197 16.3366,-7.7244 16.6688,-7.7269 16.9976,-7.7283 17.3248,-7.7291 17.6372,-7.7204 17.9235,-7.686 18.1909,-7.624 18.4459,-7.5469 18.6849,-7.4663 18.9129,-7.3836 19.1464,-7.2953 19.3829,-7.1926 19.6324,-7.0614 19.8844,-6.908 20.1332,-6.7265 20.4076,-6.5024 20.7119,-6.2482 21.0371,-5.964 21.3553,-5.6567 21.6242,-5.3709 21.8298,-5.1288 21.9986,-4.9036 22.1543,-4.674 22.296,-4.4282 22.4141,-4.1531 22.4989,-3.8553 22.5518,-3.5474 22.5829,-3.2339 22.5998,-2.8993 22.609,-2.5371 22.614,-2.1827 22.6168,-1.8668 22.6068,-1.5719 22.5536,-1.2427 22.4539,-0.8858 22.329,-0.5275 22.1653,-0.1524 21.9508,0.2363 21.6974,0.6347 21.4273,1.0202 21.1458,1.4008 20.8376,1.804 20.5081,2.1989 20.1875,2.5551 19.874,2.8788 19.5279,3.2031 19.1481,3.5323 18.7477,3.855 18.3475,4.1696 17.9861,4.448 17.6664,4.6792 17.3739,4.8779 17.1168,5.0407 16.8948,5.1704 16.7057,5.2774 16.5594,5.3698 16.4503,5.452 16.3589,5.5172 16.2751,5.5686 16.1975,5.6194 16.1234,5.6721 16.0489,5.7213 15.9719,5.7663 15.9026,5.8068 15.8467,5.8447 15.8003,5.879 15.7683,5.9182 15.7508,5.9715 15.7482,6.0232 15.7695,6.0674 15.829,6.1096 15.964,6.1531 16.1788,6.2087 16.4529,6.2822 16.7799,6.361 17.1562,6.4335 17.5957,6.514 18.0696,6.6125 18.5212,6.7185 18.9197,6.8195 19.2709,6.9201 19.6057,7.0363 19.9382,7.1611 20.2537,7.2883 20.5324,7.419 20.7753,7.5426 20.994,7.6554 21.1883,7.7692 21.3578,7.8927 21.523,8.0351 21.688,8.2015 21.844,8.3695 22.0109,8.5544 22.1997,8.7827 22.3868,9.0209 22.5593,9.2553 22.7238,9.5014 22.8816,9.7402 23.0177,9.9407 23.1282,10.1068 23.2248,10.2565 23.3138,10.3949 23.3964,10.5226 23.4642,10.6377 23.517,10.7573 23.5662,10.909 23.6136,11.0964 23.6598,11.3124 23.6987,11.5575 23.7221,11.8323 23.7348,12.1139 23.7417,12.3812 23.7455,12.652 23.7476,12.9383 23.7487,13.2173 23.7493,13.4921 23.7496,13.7807 23.7384,14.0768 23.7004,14.3792 23.6364,14.6851 23.5559,14.9792 23.4575,15.2509 23.3241,15.5241 23.1695,15.8004 23.0215,16.0442 22.8795,16.2475 22.7361,16.431 22.5828,16.6175 22.4037,16.801 22.1991,16.9807 21.9761,17.1673 21.7248,17.3624 21.4285,17.5688 21.0849,17.7859 20.6928,18.0112 20.2401,18.2455 19.7612,18.4801 19.3138,18.7012 18.9039,18.9059 18.5054,19.1084 18.104,19.3098 17.7123,19.49 17.3556,19.6405 17.0247,19.7702 16.7125,19.8796 16.4081,19.955 16.0784,19.9983 15.7234,20.0219 15.3548,20.0347 14.9878,20.0417 14.608,20.0455 14.1849,20.0475 13.7312,20.0487 13.2633,20.0493 12.7989,20.0496 12.3525,20.0498 11.9045,20.0499 11.4396,20.0499 10.9701,20.05 10.5049,20.05 10.0512,20.0317 9.6084,19.9694 9.1121,19.8625 8.5502,19.7337 8.0166,19.6066 7.5416,19.4873 7.1123,19.3837 6.7122,19.2976 6.3122,19.2212 5.9259,19.1545 5.5698,19.0932 5.237,19.0347 4.9237,18.9733 4.6188,18.9011 4.291,18.8162 3.9349,18.7199 3.561,18.6174 3.1707,18.5091 2.7873,18.3978 2.426,18.2871 2.0813,18.1767 1.7638,18.0802 1.493,18.0071 1.2659,17.9469 1.0717,17.8981 0.7152,17.769 0.1289,17.53 L-0.19,17.4 "
								strokeLinecap="round"
								fill="none"
								stroke="#4ba1f1"
								strokeWidth="3"
								strokeDasharray="6 6"
								strokeDashoffset="0"
								style={{
									animation: 'wing-flutter 0.3s ease-in-out infinite',
								}}
							/>
						</g>
					</g>
					<g transform="matrix(1, 0, 0, 1, 710.8957, 319.0867)" opacity="1">
						<g transform="scale(1)">
							<path
								d="M0,0 Q-1.1263,-0.8482 -1.5672,-1.1701 T-2.3574,-1.7355 -3.0129,-2.1981 -3.5884,-2.6162 -4.0839,-2.9736 -4.5358,-3.2843 -4.9823,-3.5742 -5.4168,-3.8413 -5.84,-4.0824 -6.2732,-4.2979 -6.7278,-4.5132 -7.1802,-4.7375 -7.6316,-4.9803 -8.1142,-5.2378 -8.6116,-5.4782 -9.1102,-5.7116 -9.6391,-5.9594 -10.2141,-6.2196 -10.8141,-6.4751 -11.4142,-6.7122 -12.0096,-6.9346 -12.5821,-7.1309 -13.1215,-7.2969 -13.6384,-7.4328 -14.1202,-7.5341 -14.5579,-7.6121 -14.9556,-7.6658 -15.311,-7.6951 -15.6571,-7.711 -16.0027,-7.7197 -16.3366,-7.7244 -16.6688,-7.7269 -16.9976,-7.7283 -17.3248,-7.7291 -17.6372,-7.7204 -17.9235,-7.686 -18.1909,-7.624 -18.4459,-7.5469 -18.6849,-7.4663 -18.9129,-7.3836 -19.1464,-7.2953 -19.3829,-7.1926 -19.6324,-7.0614 -19.8844,-6.908 -20.1332,-6.7265 -20.4076,-6.5024 -20.7119,-6.2482 -21.0371,-5.964 -21.3553,-5.6567 -21.6242,-5.3709 -21.8298,-5.1288 -21.9986,-4.9036 -22.1543,-4.674 -22.296,-4.4282 -22.4141,-4.1531 -22.4989,-3.8553 -22.5518,-3.5474 -22.5829,-3.2339 -22.5998,-2.8993 -22.609,-2.5371 -22.614,-2.1827 -22.6168,-1.8668 -22.6068,-1.5719 -22.5536,-1.2427 -22.4539,-0.8858 -22.329,-0.5275 -22.1653,-0.1524 -21.9508,0.2363 -21.6974,0.6347 -21.4273,1.0202 -21.1458,1.4008 -20.8376,1.804 -20.5081,2.1989 -20.1875,2.5551 -19.874,2.8788 -19.5279,3.2031 -19.1481,3.5323 -18.7477,3.855 -18.3475,4.1696 -17.9861,4.448 -17.6664,4.6792 -17.3739,4.8779 -17.1168,5.0407 -16.8948,5.1704 -16.7057,5.2774 -16.5594,5.3698 -16.4503,5.452 -16.3589,5.5172 -16.2751,5.5686 -16.1975,5.6194 -16.1234,5.6721 -16.0489,5.7213 -15.9719,5.7663 -15.9026,5.8068 -15.8467,5.8447 -15.8003,5.879 -15.7683,5.9182 -15.7508,5.9715 -15.7482,6.0232 -15.7695,6.0674 -15.829,6.1096 -15.964,6.1531 -16.1788,6.2087 -16.4529,6.2822 -16.7799,6.361 -17.1562,6.4335 -17.5957,6.514 -18.0696,6.6125 -18.5212,6.7185 -18.9197,6.8195 -19.2709,6.9201 -19.6057,7.0363 -19.9382,7.1611 -20.2537,7.2883 -20.5324,7.419 -20.7753,7.5426 -20.994,7.6554 -21.1883,7.7692 -21.3578,7.8927 -21.523,8.0351 -21.688,8.2015 -21.844,8.3695 -22.0109,8.5544 -22.1997,8.7827 -22.3868,9.0209 -22.5593,9.2553 -22.7238,9.5014 -22.8816,9.7402 -23.0177,9.9407 -23.1282,10.1068 -23.2248,10.2565 -23.3138,10.3949 -23.3964,10.5226 -23.4642,10.6377 -23.517,10.7573 -23.5662,10.909 -23.6136,11.0964 -23.6598,11.3124 -23.6987,11.5575 -23.7221,11.8323 -23.7348,12.1139 -23.7417,12.3812 -23.7455,12.652 -23.7476,12.9383 -23.7487,13.2173 -23.7493,13.4921 -23.7496,13.7807 -23.7384,14.0768 -23.7004,14.3792 -23.6364,14.6851 -23.5559,14.9792 -23.4575,15.2509 -23.3241,15.5241 -23.1695,15.8004 -23.0215,16.0442 -22.8795,16.2475 -22.7361,16.431 -22.5828,16.6175 -22.4037,16.801 -22.1991,16.9807 -21.9761,17.1673 -21.7248,17.3624 -21.4285,17.5688 -21.0849,17.7859 -20.6928,18.0112 -20.2401,18.2455 -19.7612,18.4801 -19.3138,18.7012 -18.9039,18.9059 -18.5054,19.1084 -18.104,19.3098 -17.7123,19.49 -17.3556,19.6405 -17.0247,19.7702 -16.7125,19.8796 -16.4081,19.955 -16.0784,19.9983 -15.7234,20.0219 -15.3548,20.0347 -14.9878,20.0417 -14.608,20.0455 -14.1849,20.0475 -13.7312,20.0487 -13.2633,20.0493 -12.7989,20.0496 -12.3525,20.0498 -11.9045,20.0499 -11.4396,20.0499 -10.9701,20.05 -10.5049,20.05 -10.0512,20.0317 -9.6084,19.9694 -9.1121,19.8625 -8.5502,19.7337 -8.0166,19.6066 -7.5416,19.4873 -7.1123,19.3837 -6.7122,19.2976 -6.3122,19.2212 -5.9259,19.1545 -5.5698,19.0932 -5.237,19.0347 -4.9237,18.9733 -4.6188,18.9011 -4.291,18.8162 -3.9349,18.7199 -3.561,18.6174 -3.1707,18.5091 -2.7873,18.3978 -2.426,18.2871 -2.0813,18.1767 -1.7638,18.0802 -1.493,18.0071 -1.2659,17.9469 -1.0717,17.8981 -0.7152,17.769 -0.1289,17.53 L0.19,17.4 "
								strokeLinecap="round"
								fill="none"
								stroke="#4ba1f1"
								strokeWidth="3"
								strokeDasharray="6 6"
								strokeDashoffset="0"
								style={{
									animation: 'wing-flutter 0.3s ease-in-out infinite',
								}}
							/>
						</g>
					</g>
					<g transform="matrix(1, 0, 0, 1, 708.5585, 296.0296)" opacity="1">
						<path
							fill="#fcfffe"
							d="M 0 14.0126 C 0 6.2736 6.2736 0 14.0126 0 C 21.7515 0 28.0251 6.2736 28.0251 14.0126 C 28.0251 21.7515 21.7515 28.0251 14.0126 28.0251 C 6.2736 28.0251 0 21.7515 0 14.0126"
						/>
						<g strokeWidth="2" fill="none" stroke="#4ba1f1">
							<path
								d="M 0 14.0126 C 0 6.2736 6.2736 0 14.0126 0 C 21.7515 0 28.0251 6.2736 28.0251 14.0126"
								strokeDasharray="4.002330498704764 4.802796598445719"
								strokeDashoffset="2"
							/>
							<path
								d="M 28.0251 14.0126 C 28.0251 21.7515 21.7515 28.0251 14.0126 28.0251 C 6.2736 28.0251 0 21.7515 0 14.0126"
								strokeDasharray="4.002330498704766 4.8027965984457195"
								strokeDashoffset="2"
							/>
						</g>
					</g>
					<g transform="matrix(1, 0, 0, 1, 728.5462, 307.5004)" opacity="1">
						<g transform="scale(1)">
							<path fill="#fcfffe" d="M 0 0 m -0.5, 0 a 0.5,0.5 0 1,0 1,0 a 0.5,0.5 0 1,0 -1,0" />
							<path
								d="M 0 0 m -0.5, 0 a 0.5,0.5 0 1,0 1,0 a 0.5,0.5 0 1,0 -1,0"
								strokeLinecap="round"
								fill="#4ba1f1"
								stroke="#4ba1f1"
								strokeWidth="3"
								strokeDasharray="none"
								strokeDashoffset="0"
							/>
						</g>
					</g>
					<g transform="matrix(1, 0, 0, 1, 716.0307, 305.4877)" opacity="1">
						<g transform="scale(1)">
							<path fill="#fcfffe" d="M 0 0 m -0.5, 0 a 0.5,0.5 0 1,0 1,0 a 0.5,0.5 0 1,0 -1,0" />
							<path
								d="M 0 0 m -0.5, 0 a 0.5,0.5 0 1,0 1,0 a 0.5,0.5 0 1,0 -1,0"
								strokeLinecap="round"
								fill="#4ba1f1"
								stroke="#4ba1f1"
								strokeWidth="3"
								strokeDasharray="none"
								strokeDashoffset="0"
							/>
						</g>
					</g>
					<g transform="matrix(1, 0, 0, 1, 730.6209, 348.9409)" opacity="1">
						<g transform="scale(1)">
							<path
								d="M0,0 Q0,1.5094 0,2.0727 T0,3.0997 0,3.9731 0,4.74 0,5.4081 0,6.0177 0.0274,6.6047 0.1038,7.1429 0.2115,7.6318 0.3408,8.1121 0.4886,8.5831 0.6466,9.0491 0.826,9.5329 1.0444,10.0149 1.2864,10.4892 1.532,10.9706 1.7773,11.4514 2.0157,11.9068 2.2616,12.3346 2.5322,12.7543 2.8071,13.165 3.082,13.5754 3.3684,13.9925 3.6473,14.4086 3.9221,14.8128 4.2062,15.1968 4.4655,15.5448 4.6773,15.839 4.8564,16.0857 5.0062,16.2997 5.2565,16.6669 5.6603,17.2518 L5.88,17.57 "
								strokeLinecap="round"
								fill="none"
								stroke="#4ba1f1"
								strokeWidth="3"
								strokeDasharray="6 6"
								strokeDashoffset="0"
							/>
						</g>
					</g>
					<g transform="matrix(1, 0, 0, 1, 717.1205, 349.2355)" opacity="1">
						<g transform="scale(1)">
							<path
								d="M0,0 Q0,0.7433 0,0.9751 T0,1.3741 0,1.6618 0,1.8753 0,2.0462 0,2.1961 0,2.337 0,2.4774 0,2.6496 0,2.8709 0,3.1259 0,3.4219 0,3.7721 0.0114,4.1565 0.0404,4.532 0.0813,4.8959 0.1308,5.2648 0.1806,5.6183 0.2259,5.9542 0.2757,6.3148 0.3415,6.7071 0.4229,7.0823 0.5151,7.4278 0.6131,7.7708 0.7165,8.1307 0.823,8.4906 0.9425,8.8483 1.0827,9.2184 1.2228,9.5703 1.3697,9.9099 1.5386,10.2656 1.7285,10.637 1.9366,11.0237 2.1434,11.421 2.3379,11.8241 2.5349,12.2144 2.7402,12.5795 2.9476,12.924 3.1539,13.2505 3.3596,13.5672 3.549,13.8649 3.7091,14.1362 3.8554,14.3956 3.9897,14.6393 4.1084,14.8631 4.2163,15.0714 4.3183,15.2691 4.5266,15.6229 4.8721,16.1845 L5.06,16.49 "
								strokeLinecap="round"
								fill="none"
								stroke="#4ba1f1"
								strokeWidth="3"
								strokeDasharray="6 6"
								strokeDashoffset="0"
							/>
						</g>
					</g>
					<g transform="matrix(1, 0, 0, 1, 710.657, 327.64)" opacity="1">
						<g transform="scale(1)">
							<path
								d="M0,0 Q-0.839,0 -1.1243,0 T-1.6581,0 -2.1173,0 -2.5061,0 -2.843,0 -3.1472,0 -3.4426,0 -3.7332,-0.0091 -4.0076,-0.0346 -4.2664,-0.0781 -4.5006,-0.1405 -4.6987,-0.2064 -4.868,-0.2787 -5.0308,-0.3659 -5.1992,-0.459 -5.3751,-0.5529 -5.5552,-0.6451 -5.7352,-0.7476 -5.9175,-0.8764 -6.1033,-1.0194 -6.2865,-1.1588 -6.4659,-1.303 -6.6433,-1.4544 -6.8219,-1.6051 -7.0057,-1.7533 -7.1832,-1.8977 -7.3482,-2.0492 -7.5132,-2.2137 -7.685,-2.3853 -7.8606,-2.563 -8.0541,-2.7486 -8.2757,-2.9544 -8.5034,-3.1964 -8.7207,-3.4671 -8.9301,-3.7397 -9.1307,-4.0043 -9.331,-4.2919 -9.5358,-4.5966 -9.7201,-4.8603 -9.8705,-5.0813 -10.137,-5.4455 -10.5729,-6.0119 L-10.81,-6.32 "
								strokeLinecap="round"
								fill="none"
								stroke="#4ba1f1"
								strokeWidth="3"
								strokeDasharray="6 6"
								strokeDashoffset="0"
							/>
						</g>
					</g>
					<g transform="matrix(1, 0, 0, 1, 736.0732, 325.5271)" opacity="1">
						<g transform="scale(1)">
							<path
								d="M0,0 Q0.7843,0 1.0455,0 T1.5059,0 1.8839,0 2.231,0 2.5839,0 2.9583,0.0114 3.3376,0.0541 3.7354,0.1275 4.1297,0.213 4.4878,0.2983 4.8376,0.3971 5.199,0.5238 5.5574,0.668 5.8778,0.8126 6.1615,0.9459 6.4458,1.08 6.7282,1.2328 6.9958,1.4025 7.2873,1.5746 7.61,1.7412 7.9155,1.9162 8.2276,2.1277 8.5798,2.3773 8.9447,2.6453 9.3074,2.9256 9.6483,3.1966 9.9409,3.4285 10.2848,3.7734 10.748,4.3023 L11,4.59 "
								strokeLinecap="round"
								fill="none"
								stroke="#4ba1f1"
								strokeWidth="3"
								strokeDasharray="6 6"
								strokeDashoffset="0"
							/>
						</g>
					</g>
					<g transform="matrix(1, 0, 0, 1, 725.6916, 312.7021)" opacity="1">
						<g transform="scale(1)">
							<path
								d="M0,0 Q-0.1824,0.8482 -0.2936,1.1632 T-0.5382,1.7432 -0.8081,2.2228 -1.1145,2.641 -1.4658,3.0418 -1.8188,3.383 -2.1796,3.6461 -2.5537,3.8668 -2.9077,4.0438 -3.2781,4.1675 -3.6803,4.2416 -4.0449,4.2819 -4.3778,4.2879 -4.7208,4.2296 -5.083,4.0838 -5.4715,3.8495 -5.8835,3.5351 -6.2946,3.1748 -6.6869,2.7873 -7.0873,2.3531 -7.4625,1.9207 -7.7463,1.5647 -7.9578,1.2684 -8.1457,0.9819 -8.3278,0.6869 -8.5659,0.1799 -8.8924,-0.6037 L-9.07,-1.03 "
								strokeLinecap="round"
								fill="none"
								stroke="#4ba1f1"
								strokeWidth="3"
								strokeDasharray="6 6"
								strokeDashoffset="0"
							/>
						</g>
					</g>
					<g transform="matrix(1, 0, 0, 1, 734.7311, 301.2194)" opacity="1">
						<g transform="scale(1)">
							<path
								d="M0,0 Q-0.5791,-1.0397 -0.837,-1.4502 T-1.3399,-2.2184 -1.8233,-2.8986 -2.2983,-3.524 -2.7551,-4.0876 -3.1632,-4.5789 -3.5767,-5.0764 -4.0479,-5.6047 -4.5185,-6.0905 -4.9615,-6.5326 -5.3735,-6.9441 -5.7549,-7.3184 -6.1494,-7.6931 -6.576,-8.0907 -7.0338,-8.5053 -7.5223,-8.9338 -8.032,-9.3721 -8.5532,-9.8135 -9.0784,-10.2565 -9.6035,-10.6981 -10.0944,-11.098 -10.5074,-11.4135 -10.8711,-11.6787 -11.2354,-11.9415 -11.6046,-12.1984 -11.965,-12.434 -12.3093,-12.6488 -12.6334,-12.8477 -12.9168,-13.0175 -13.1554,-13.1531 -13.365,-13.2657 -13.5405,-13.352 -13.6725,-13.4127 -13.7717,-13.4593 -13.8462,-13.4961 -13.9026,-13.5207 -13.9516,-13.5363 -13.9919,-13.5426 -14.0207,-13.5346 -14.0386,-13.5165 -14.0484,-13.493 -14.0559,-13.4688 -14.0669,-13.4466 -14.082,-13.4208 -14.1062,-13.3771 -14.1558,-13.2918 -14.2535,-13.1451 -14.4092,-12.9239 -14.6056,-12.6531 -14.8151,-12.3781 -15.0385,-12.0825 -15.2923,-11.7348 -15.5854,-11.3496 -15.9135,-10.9485 -16.2425,-10.5525 -16.5423,-10.1843 -16.808,-9.8563 -17.0346,-9.5844 -17.2149,-9.3726 -17.3609,-9.1936 -17.4836,-9.0346 -17.5846,-8.9003 -17.6805,-8.7702 -17.7783,-8.6287 -17.8703,-8.4834 -17.9545,-8.3496 -18.0277,-8.2358 -18.0903,-8.1397 -18.1472,-8.0555 -18.1986,-7.9777 -18.2517,-7.899 -18.3193,-7.7968 -18.4017,-7.6638 -18.4967,-7.5093 -18.6282,-7.3067 -18.8,-7.0551 -18.9801,-6.7906 -19.167,-6.5053 -19.3645,-6.2042 -19.5562,-5.9196 -19.7267,-5.669 -19.8718,-5.4597 -19.9918,-5.2934 -20.0822,-5.1664 -20.1473,-5.0677 -20.1987,-4.989 -20.2449,-4.9165 -20.2997,-4.8269 -20.3751,-4.7052 -20.464,-4.566 -20.567,-4.4128 -20.6915,-4.2314 -20.8322,-4.0392 -20.9794,-3.8526 -21.1096,-3.6804 -21.2078,-3.5412 -21.3593,-3.2351 -21.5994,-2.6942 L-21.73,-2.4 "
								strokeLinecap="round"
								fill="none"
								stroke="#4ba1f1"
								strokeWidth="3"
								strokeDasharray="6 6"
								strokeDashoffset="0"
							/>
						</g>
					</g>
				</svg>
			</div>

			{/* Fairy Dust */}
			{fairyDust.map((dust) => (
				<div
					key={dust.id}
					style={{
						position: 'absolute',
						left: dust.x,
						top: dust.y,
						width: dust.size,
						height: dust.size,
						borderRadius: '50%',
						backgroundColor: '#FFD700',
						opacity: dust.life,
						boxShadow: `0 0 ${dust.size * 2}px rgba(255, 215, 0, ${dust.life})`,
						transform: 'translate(-50%, -50%)',
					}}
				/>
			))}

			<style
				dangerouslySetInnerHTML={{
					__html: `
				@keyframes fairy-bob {
					0%, 100% {
						transform: translate(-50%, -50%) translateY(0);
					}
					50% {
						transform: translate(-50%, -50%) translateY(-8px);
					}
				}

				@keyframes wing-flutter {
					0%, 100% {
						opacity: 0.8;
						transform: scaleY(1);
					}
					50% {
						opacity: 0.6;
						transform: scaleY(0.45);
					}
				}
			`,
				}}
			/>
		</div>
	)
}
