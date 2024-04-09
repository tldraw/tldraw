import {
	LegacyTldrawDocument,
	TldrawUiButton,
	TldrawUiButtonLabel,
	useEditor,
	useValue,
} from 'tldraw'

export function MigrationAnnouncement({
	onClose,
	originalFile,
}: {
	onClose: () => void
	originalFile: { name: string; document: LegacyTldrawDocument }
}) {
	const editor = useEditor()
	const isDarkMode = useValue('is dark mode', () => editor.user.getIsDarkMode(), [editor])

	const downloadFile = () => {
		const originalFileJson = JSON.stringify(originalFile)
		const a = document.createElement('a')
		a.href = URL.createObjectURL(new Blob([originalFileJson], { type: 'application/json' }))
		a.download = 'Drawing (old).tldr'
		a.click()
	}

	return (
		<div
			style={{
				width: 500,
				maxWidth: '100%',
				lineHeight: '1.6',
				overflow: 'auto',
				color: 'var(--color-text-0)',
			}}
		>
			<div
				style={{
					position: 'relative',
					display: 'block',
					width: '100%',
					aspectRatio: '2/1',
					borderBottom: '2px solid var(--color-divider)',
				}}
			>
				<img
					src={isDarkMode ? '/github-hero-dark.png' : '/github-hero-light.png'}
					alt="tldraw"
					className="object-fill"
					loading="lazy"
				/>
			</div>
			<div
				style={{
					paddingLeft: 'var(--space-6)',
					paddingRight: 'var(--space-6)',
					paddingTop: 'var(--space-5)',
					paddingBottom: 'var(--space-6)',
					display: 'flex',
					flexDirection: 'column',
					gap: 'var(--space-4)',
				}}
			>
				<p style={{ margin: 0, fontSize: 16 }}>
					<b>Welcome to the new tldraw!</b>
					{
						" We've re-written the app to be faster, more stable, and maybe even more fun. For more on what's new, "
					}
					<a
						href="https://tldraw.substack.com/p/tiny-little-seed-round"
						target="_blank"
						rel="noreferrer"
						style={{ textDecoration: 'underline' }}
					>
						check out our announcement
					</a>
					.
				</p>
				<p style={{ margin: 0, fontSize: 16 }}>
					We&apos;ve also <b>upgraded your project</b> to the new version. If you want a backup of
					the original file you can{' '}
					<span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={downloadFile}>
						download it
					</span>{' '}
					as a file and then open it at{' '}
					<a
						href="https://old.tldraw.com"
						target="_blank"
						rel="noreferrer"
						style={{ textDecoration: 'underline' }}
					>
						old.tldraw.com
					</a>
					.
				</p>
				<p style={{ margin: 0, fontSize: 16 }}>
					{'Have questions? Let us know on the '}
					<a
						href="https://discord.gg/SBBEVCA4PG"
						target="_blank"
						rel="noreferrer"
						style={{ textDecoration: 'underline' }}
					>
						tldraw discord server
					</a>
					.
				</p>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						margin: -12,
						marginTop: 8,
					}}
				>
					<TldrawUiButton
						type="normal"
						style={{ fontSize: 14, marginRight: 'auto' }}
						onClick={downloadFile}
					>
						<TldrawUiButtonLabel>Download original</TldrawUiButtonLabel>
					</TldrawUiButton>
					<TldrawUiButton style={{ fontSize: 14 }} type="primary" onClick={onClose}>
						<TldrawUiButtonLabel>Continue</TldrawUiButtonLabel>
					</TldrawUiButton>
				</div>
			</div>
		</div>
	)
}
