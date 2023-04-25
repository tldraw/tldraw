export function FullPageMessage({ children }: { children: React.ReactNode }) {
	return (
		<div
			style={{
				backgroundColor: 'var(--vscode-editor-background)',
				color: 'var(--vscode-editor-foreground)',
				position: 'fixed',
				top: '50%',
				left: '50%',
				WebkitTransform: 'translate(-50%, -50%)',
				transform: 'translate(-50%, -50%)',
			}}
		>
			{children}
		</div>
	)
}
