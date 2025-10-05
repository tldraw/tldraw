'use client'

import { Document, Folder, Workspace } from '@/lib/api/types'
import Link from 'next/link'

interface WorkspaceBrowserClientProps {
	workspace: Workspace
	documents: Document[]
	folders: Folder[]
	role: 'owner' | 'member'
	isOwner: boolean
	userId: string
}

export default function WorkspaceBrowserClient({
	workspace,
	documents,
	folders,
	role,
	isOwner,
	userId,
}: WorkspaceBrowserClientProps) {
	return (
		<div className="flex h-screen flex-col">
			{/* Header */}
			<header className="border-b px-6 py-4">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">{workspace.name}</h1>
						<p className="text-sm text-gray-600">{isOwner ? 'Owner' : `Member (${role})`}</p>
					</div>
					<div className="flex gap-2">
						<Link
							href={`/workspace/${workspace.id}/archive`}
							className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
						>
							Archive
						</Link>
						{isOwner && (
							<>
								<Link
									href={`/workspace/${workspace.id}/members`}
									className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
								>
									Members
								</Link>
								<Link
									href={`/workspace/${workspace.id}/settings`}
									className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
								>
									Settings
								</Link>
							</>
						)}
						<Link
							href="/dashboard"
							className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
						>
							Back to Dashboard
						</Link>
					</div>
				</div>
			</header>

			{/* Main content */}
			<div className="flex flex-1 overflow-hidden">
				{/* Folder tree sidebar */}
				<aside className="w-64 overflow-y-auto border-r p-4">
					<h2 className="mb-4 font-semibold">Folders</h2>
					{folders.length === 0 ? (
						<p className="text-sm text-gray-500">No folders yet</p>
					) : (
						<ul className="space-y-1">
							{folders.map((folder) => (
								<li key={folder.id}>
									<button className="w-full rounded px-2 py-1 text-left text-sm hover:bg-gray-100">
										📁 {folder.name}
									</button>
								</li>
							))}
						</ul>
					)}
				</aside>

				{/* Documents list */}
				<main className="flex-1 overflow-y-auto p-6">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-xl font-semibold">Documents</h2>
						<button className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
							+ New Document
						</button>
					</div>

					{documents.length === 0 ? (
						<div className="rounded-lg border border-dashed p-12 text-center">
							<p className="text-gray-500">No documents in this workspace yet</p>
							<p className="mt-2 text-sm text-gray-400">Create a new document to get started</p>
						</div>
					) : (
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{documents.map((doc) => (
								<Link
									key={doc.id}
									href={`/d/${doc.id}`}
									className="rounded-lg border p-4 hover:border-blue-500 hover:shadow-md"
								>
									<h3 className="font-medium">{doc.name}</h3>
									<p className="mt-2 text-xs text-gray-500">
										{new Date(doc.created_at).toLocaleDateString()}
									</p>
									{doc.sharing_mode !== 'private' && (
										<span className="mt-2 inline-block rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
											{doc.sharing_mode}
										</span>
									)}
								</Link>
							))}
						</div>
					)}
				</main>
			</div>
		</div>
	)
}
