export function TlaPageControls() {
	return (
		<div className="tla_page_controls">
			<div className="tla_page_controls__search">
				<input className="tla_page_controls__search_input" placeholder="Search..."></input>
			</div>
			<div className="tla_page_controls__right">
				<div className="tla_page_controls__sort">
					<div className="tla_page_controls__sort_label">{}</div>
					<select>
						<option value="recent">Recent</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>
				<div className="tla_page_controls__grid">
					<select>
						<option value="grid">Grid</option>
						<option value="list">List</option>
					</select>
				</div>
			</div>
		</div>
	)
}
