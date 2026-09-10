const railIcons = [
	<g key="compose">
		<path d="M12 4H6a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h11a3 3 0 0 0 3-3v-6" />
		<path d="m10 14 1-4 8-8 3 3-8 8-4 1Z" />
	</g>,
	<g key="images">
		<rect x="3" y="8" width="14" height="13" rx="3" />
		<path d="m7 8 1-4a3 3 0 0 1 3-2l9 2a3 3 0 0 1 2 3l-1 9a3 3 0 0 1-3 2M3 17l4-4 5 6 2-2 3 3" />
		<circle cx="12" cy="12" r="1" />
	</g>,
	<g key="search">
		<circle cx="10.5" cy="10.5" r="7.5" />
		<path d="m16 16 6 6" />
	</g>,
	<path key="chat" d="M21 11.5a9 9 0 0 1-13 8L3 21l1.5-5A9 9 0 1 1 21 11.5Z" />,
]

export function AppChrome() {
	return (
		<>
			<aside className="app-rail" aria-hidden="true">
				<div className="app-rail__brand">
					<svg viewBox="0 0 17.158 18.085" fill="currentColor">
						<path d="M 0 2.35 C 0 1.048 0.995 0 2.23 0 L 14.928 0 C 16.163 0 17.158 1.048 17.158 2.35 L 17.158 15.734 C 17.158 17.036 16.163 18.084 14.928 18.084 L 2.23 18.084 C 0.995 18.085 0 17.037 0 15.735 Z M 8.579 3.797 C 7.721 3.797 7.035 4.521 7.035 5.425 C 7.035 6.329 7.721 7.053 8.579 7.053 C 9.437 7.053 10.123 6.329 10.123 5.425 C 10.123 4.521 9.437 3.797 8.579 3.797 Z M 8.064 14.649 C 8.802 14.649 9.506 13.582 9.763 13.003 C 10.089 12.261 10.278 10.941 9.952 10.163 C 9.719 9.584 9.152 9.21 8.528 9.223 C 7.704 9.223 7.035 9.928 7.035 10.796 C 7.035 11.574 7.567 12.189 8.253 12.316 C 8.287 12.316 8.322 12.37 8.322 12.406 C 8.253 12.858 8.064 13.436 7.772 13.726 C 7.412 14.088 7.515 14.649 8.064 14.649 Z" />
					</svg>
				</div>
				<div className="app-rail__items">
					{railIcons.map((icon, index) => (
						<span className="app-rail__item" key={index}>
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.7"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								{icon}
							</svg>
						</span>
					))}
				</div>
				<span className="app-rail__profile">LU</span>
			</aside>
			<header className="app-topbar" aria-hidden="true">
				<div className="app-mode-switch">
					<span className="app-mode-switch__item app-mode-switch__item--active">Chat</span>
					<span className="app-mode-switch__item">Work</span>
				</div>
				<span className="app-topbar__temporary-chat">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.7"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M8 3a9 9 0 0 1 8 0M20 6a9 9 0 0 1 1 7M19 17a9 9 0 0 1-7 4M8 20l-5 1 1-5M3 12a9 9 0 0 1 1-6" />
					</svg>
				</span>
			</header>
		</>
	)
}
