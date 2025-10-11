export function NewFileIcon({ className }: { className?: string }) {
	return (
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			stroke="currentColor"
			className={className}
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M4 21H18C18.5304 21 19.0391 20.7893 19.4142 20.4142C19.7893 20.0391 20 19.5304 20 19V8L15 3H6C5.46957 3 4.96086 3.21071 4.58579 3.58579C4.21071 3.96086 4 4.46957 4 5V7" />
			<path d="M14 3V7C14 7.53043 14.2107 8.03914 14.5858 8.41421C14.9609 8.78929 15.4696 9 16 9H20" />
			<path d="M3 14H9" />
			<path d="M6 11V17" />
		</svg>
	)
}
