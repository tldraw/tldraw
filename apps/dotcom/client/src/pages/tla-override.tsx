import { deleteFromLocalStorage, setInLocalStorage } from 'tldraw'
import { tlaOverrideFlag } from '../routes'
import { TlaButton } from '../tla/components/TlaButton/TlaButton'

export function Component() {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: '1rem',
				justifyContent: 'center',
				alignItems: 'center',
				flex: 1,
				padding: 20,
				textAlign: 'center',
			}}
		>
			<div
				style={{
					marginTop: 20,
					border: '1px dashed #888',
					padding: 20,
					display: 'flex',
					flexDirection: 'column',
					gap: '1rem',
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<p>Sneaky stuff for testing new logged-out UI</p>
				<div style={{ display: 'flex', gap: 10 }}>
					<TlaButton
						variant="primary"
						onClick={() => {
							setInLocalStorage(tlaOverrideFlag, 'true')
							window.location.href = '/'
						}}
					>
						Enable override
					</TlaButton>
					<TlaButton
						variant="secondary"
						onClick={() => {
							deleteFromLocalStorage(tlaOverrideFlag)
							window.location.href = '/'
						}}
					>
						Disable override
					</TlaButton>
				</div>
			</div>
		</div>
	)
}
