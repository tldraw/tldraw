export function FairyManualPanel() {
	return (
		<div className="fairy-manual-content">
			<div className="fairy-manual-section">
				<h3>Getting Started</h3>
				<p>
					Fairies are AI assistants that can help you create and edit content on the canvas. Click
					on a fairy to start chatting with them.
				</p>
			</div>

			<div className="fairy-manual-section">
				<h3>Selecting Fairies</h3>
				<ul>
					<li>
						<strong>Click</strong> a fairy to select it and open the chat panel
					</li>
					<li>
						<strong>Shift+Click</strong> to select multiple fairies for a group project
					</li>
					<li>
						<strong>Double-click</strong> to zoom to a fairy&apos;s location
					</li>
				</ul>
			</div>

			<div className="fairy-manual-section">
				<h3>Working with Projects</h3>
				<p>
					When you select multiple fairies, they can work together on a project. One fairy will
					become the orchestrator and coordinate the work of the others.
				</p>
			</div>

			<div className="fairy-manual-section">
				<h3>Tips</h3>
				<ul>
					<li>Be specific in your requests for better results</li>
					<li>You can drag fairies around the canvas</li>
					<li>Right-click a fairy for more options</li>
				</ul>
			</div>
		</div>
	)
}
