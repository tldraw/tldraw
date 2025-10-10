'use client'

import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command'
import { File, Folder } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SidebarContext } from './Sidebar'

interface SearchResult {
	id: string
	type: 'document' | 'folder'
	name: string
	workspaceName: string
	workspaceId: string
	folderId?: string
}

interface SearchDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	searchContext: SidebarContext
	userId: string
}

/**
 * SearchDialog
 *
 * Command palette-style search dialog for finding documents and folders.
 *
 * Features:
 * - Global search (across all workspaces)
 * - Context-specific search (within current view)
 * - Keyboard shortcuts (⌘K / Ctrl+K)
 * - Real-time search results as you type
 * - Navigate directly to documents/folders
 */
export function SearchDialog({ open, onOpenChange, searchContext, userId }: SearchDialogProps) {
	const router = useRouter()
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<SearchResult[]>([])
	const [isLoading, setIsLoading] = useState(false)

	// Fetch search results
	useEffect(() => {
		if (!query.trim()) {
			setResults([])
			return
		}

		const fetchResults = async () => {
			setIsLoading(true)
			try {
				const params = new URLSearchParams({
					q: query.trim(),
					context:
						searchContext === 'recent' ? 'recent' : searchContext === 'workspaces' ? 'all' : 'all',
				})

				const response = await fetch(`/api/search?${params}`)
				const data = await response.json()

				if (data.success && data.data) {
					setResults(data.data)
				} else {
					setResults([])
				}
			} catch (err) {
				console.error('Search failed:', err)
				setResults([])
			} finally {
				setIsLoading(false)
			}
		}

		// Debounce search
		const timeoutId = setTimeout(fetchResults, 300)
		return () => clearTimeout(timeoutId)
	}, [query, searchContext, userId])

	// Handle item selection
	const handleSelect = (result: SearchResult) => {
		if (result.type === 'document') {
			router.push(`/d/${result.id}`)
		} else if (result.type === 'folder') {
			router.push(`/workspace/${result.workspaceId}/folder/${result.id}`)
		}
		onOpenChange(false)
		setQuery('')
	}

	// Reset query when dialog closes
	useEffect(() => {
		if (!open) {
			setQuery('')
			setResults([])
		}
	}, [open])

	const searchLabel =
		searchContext === 'workspaces'
			? 'Search all workspaces...'
			: searchContext === 'recent'
				? 'Search recent documents...'
				: 'Search shared with me...'

	return (
		<CommandDialog open={open} onOpenChange={onOpenChange}>
			<CommandInput
				placeholder={searchLabel}
				value={query}
				onValueChange={setQuery}
				data-testid="search-input"
			/>
			<CommandList>
				<CommandEmpty>
					{isLoading ? 'Searching...' : query ? 'No results found.' : 'Type to search'}
				</CommandEmpty>

				{results.length > 0 && (
					<>
						{/* Group documents */}
						{results.filter((r) => r.type === 'document').length > 0 && (
							<CommandGroup heading="Documents">
								{results
									.filter((r) => r.type === 'document')
									.map((result) => (
										<CommandItem
											key={`doc-${result.id}`}
											onSelect={() => handleSelect(result)}
											data-testid={`search-result-${result.id}`}
										>
											<File className="mr-2 h-4 w-4" />
											<div className="flex-1 min-w-0">
												<div className="font-medium truncate">{result.name}</div>
												<div className="text-xs text-muted-foreground truncate">
													{result.workspaceName}
												</div>
											</div>
										</CommandItem>
									))}
							</CommandGroup>
						)}

						{/* Group folders */}
						{results.filter((r) => r.type === 'folder').length > 0 && (
							<CommandGroup heading="Folders">
								{results
									.filter((r) => r.type === 'folder')
									.map((result) => (
										<CommandItem
											key={`folder-${result.id}`}
											onSelect={() => handleSelect(result)}
											data-testid={`search-result-${result.id}`}
										>
											<Folder className="mr-2 h-4 w-4" />
											<div className="flex-1 min-w-0">
												<div className="font-medium truncate">{result.name}</div>
												<div className="text-xs text-muted-foreground truncate">
													{result.workspaceName}
												</div>
											</div>
										</CommandItem>
									))}
							</CommandGroup>
						)}
					</>
				)}
			</CommandList>
		</CommandDialog>
	)
}
