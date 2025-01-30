import { SignIn } from '@clerk/clerk-react'

export function Component() {
	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				overflow: 'auto',
				padding: 20,
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					alignItems: 'center',
					minHeight: '100%',
				}}
			>
				<SignIn />
			</div>
		</div>
	)
}
