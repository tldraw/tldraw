// Classic 3.5" floppy disk: body outline, metal shutter at the top with
// notch, label rectangle with two ruled lines. Uses currentColor so the
// menu bar's hover-invert treatment Just Works.
export function FloppyIcon(props: { className?: string }) {
	return (
		<svg className={props.className} viewBox="0 0 32 32" aria-hidden="true" fill="none">
			<rect
				x="3"
				y="3"
				width="26"
				height="26"
				rx="1.5"
				stroke="currentColor"
				strokeWidth="2"
				fill="none"
			/>
			<rect x="7" y="3" width="18" height="9" fill="currentColor" />
			<rect x="20" y="4.5" width="3" height="6" fill="var(--tla-color-desktop-bg)" />
			<rect
				x="7.5"
				y="16"
				width="17"
				height="11"
				stroke="currentColor"
				strokeWidth="1.6"
				fill="none"
			/>
			<line x1="9.5" y1="20" x2="22.5" y2="20" stroke="currentColor" strokeWidth="1.2" />
			<line x1="9.5" y1="23.5" x2="22.5" y2="23.5" stroke="currentColor" strokeWidth="1.2" />
		</svg>
	)
}
