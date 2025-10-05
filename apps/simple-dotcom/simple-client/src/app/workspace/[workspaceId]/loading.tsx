export default function WorkspaceLoading() {
	return (
		<div className="flex h-screen items-center justify-center">
			<div className="text-center">
				<div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
				<p className="text-gray-600">Loading workspace...</p>
			</div>
		</div>
	)
}
