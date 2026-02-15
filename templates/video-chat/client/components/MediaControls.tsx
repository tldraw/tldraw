interface MediaControlsProps {
	audioEnabled: boolean
	videoEnabled: boolean
	onToggleAudio: () => void
	onToggleVideo: () => void
	onLeave: () => void
}

export function MediaControls({
	audioEnabled,
	videoEnabled,
	onToggleAudio,
	onToggleVideo,
	onLeave,
}: MediaControlsProps) {
	return (
		<div className="media-controls">
			<button
				className={`media-btn ${!audioEnabled ? 'off' : ''}`}
				onClick={onToggleAudio}
				title={audioEnabled ? 'Mute' : 'Unmute'}
			>
				{audioEnabled ? <MicIcon /> : <MicOffIcon />}
			</button>
			<button
				className={`media-btn ${!videoEnabled ? 'off' : ''}`}
				onClick={onToggleVideo}
				title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
			>
				{videoEnabled ? <CameraIcon /> : <CameraOffIcon />}
			</button>
			<button className="media-btn leave" onClick={onLeave} title="Leave video chat">
				<PhoneOffIcon />
			</button>
		</div>
	)
}

function MicIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth="1.5"
			stroke="currentColor"
			width={18}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
			/>
		</svg>
	)
}

function MicOffIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth="1.5"
			stroke="currentColor"
			width={18}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
			/>
			<line
				x1="3"
				y1="3"
				x2="21"
				y2="21"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</svg>
	)
}

function CameraIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth="1.5"
			stroke="currentColor"
			width={18}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
			/>
		</svg>
	)
}

function CameraOffIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth="1.5"
			stroke="currentColor"
			width={18}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
			/>
			<line
				x1="3"
				y1="3"
				x2="21"
				y2="21"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</svg>
	)
}

function PhoneOffIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth="1.5"
			stroke="currentColor"
			width={18}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M15.536 8.464a5 5 0 0 1 0 7.072m2.828-9.9a9 9 0 0 1 0 12.728M5.636 15.536a5 5 0 0 1 0-7.072m-2.828 9.9a9 9 0 0 1 0-12.728"
			/>
			<line
				x1="3"
				y1="3"
				x2="21"
				y2="21"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</svg>
	)
}
