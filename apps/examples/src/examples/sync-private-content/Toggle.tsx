export function Toggle({ isChecked }: { isChecked: boolean }) {
	const height = 20
	const width = 40
	const pillSize = height - 4
	return (
		<div
			style={{
				cursor: 'pointer',
				width,
				height,
				borderRadius: height / 2,
				backgroundColor: isChecked ? '#4bb05e' : '#999',
				display: 'flex',
				alignItems: 'center',
				justifyContent: isChecked ? 'flex-end' : 'flex-start',
				padding: 2,
			}}
		>
			{isChecked && (
				<div
					style={{ fontSize: 9, fontWeight: 600, color: 'white', position: 'relative', left: -3 }}
				>
					ON
				</div>
			)}
			<div
				style={{
					width: pillSize,
					height: pillSize,
					borderRadius: pillSize / 2,
					backgroundColor: 'white',
				}}
			/>
			{!isChecked && (
				<div
					style={{ fontSize: 9, fontWeight: 600, color: 'white', position: 'relative', right: -1 }}
				>
					OFF
				</div>
			)}
		</div>
	)
}
