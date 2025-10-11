'use client'

import { RecentDocument } from '@/lib/api/types'
import { getRelevantDates } from '@/lib/utils/dates'
import { useRef } from 'react'
import { SidebarDocumentItem } from './SidebarDocumentItem'
import { SidebarFileSection } from './SidebarFileSection'

interface RecentViewProps {
	recentDocuments: RecentDocument[]
}

interface DocumentSnapshot {
	documentId: string
	date: number
}

/**
 * RecentView
 *
 * Displays recently accessed documents grouped by time periods (Today, Yesterday, This Week, etc.)
 * with snapshot preservation to prevent files from jumping between sections.
 *
 * Features:
 * - Time-based grouping: Today, Yesterday, This Week, This Month, Older
 * - Snapshot preservation: Files stay in their section during a session
 * - Sections only render when they have files
 * - Files sorted by date within each section (most recent first)
 * - Snapshot invalidated on page reload or when document is accessed (updates accessed_at)
 *
 * Based on: apps/dotcom/client/src/tla/app/TldrawApp.ts:309-361
 */
export function RecentView({ recentDocuments }: RecentViewProps) {
	// Snapshot preservation: Store document timestamps from first render
	// This prevents files from moving between sections as time advances
	const lastRecentFileOrdering = useRef<DocumentSnapshot[] | null>(null)

	if (recentDocuments.length === 0) {
		return (
			<div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
				<div className="text-center">
					<p className=" font-medium text-foreground/80">No recent documents</p>
				</div>
			</div>
		)
	}

	// Build next ordering with snapshot preservation
	const nextOrdering: DocumentSnapshot[] = []

	for (const document of recentDocuments) {
		const existing = lastRecentFileOrdering.current?.find((f) => f.documentId === document.id)

		if (existing) {
			// Preserve snapshot - use old date to keep file in same section
			nextOrdering.push(existing)
		} else {
			// Create new snapshot with current accessed_at date
			nextOrdering.push({
				documentId: document.id,
				date: new Date(document.accessed_at).getTime(),
			})
		}
	}

	// Sort by date (most recent first)
	nextOrdering.sort((a, b) => b.date - a.date)

	// Save snapshot for next render
	lastRecentFileOrdering.current = nextOrdering

	// Get time boundaries
	const { today, yesterday, thisWeek, thisMonth } = getRelevantDates()

	// Group documents by time period using snapshot dates
	const todayDocs: RecentDocument[] = []
	const yesterdayDocs: RecentDocument[] = []
	const thisWeekDocs: RecentDocument[] = []
	const thisMonthDocs: RecentDocument[] = []
	const olderDocs: RecentDocument[] = []

	for (const snapshot of nextOrdering) {
		const document = recentDocuments.find((d) => d.id === snapshot.documentId)
		if (!document) continue

		const { date } = snapshot

		if (date >= today) {
			todayDocs.push(document)
		} else if (date >= yesterday) {
			yesterdayDocs.push(document)
		} else if (date >= thisWeek) {
			thisWeekDocs.push(document)
		} else if (date >= thisMonth) {
			thisMonthDocs.push(document)
		} else {
			olderDocs.push(document)
		}
	}

	return (
		<div data-testid="recent-view" className="flex flex-col">
			{todayDocs.length > 0 && (
				<SidebarFileSection title="Today">
					{todayDocs.map((doc) => (
						<SidebarDocumentItem key={doc.id} document={doc} showActions={false} depth={1} />
					))}
				</SidebarFileSection>
			)}

			{yesterdayDocs.length > 0 && (
				<SidebarFileSection title="Yesterday">
					{yesterdayDocs.map((doc) => (
						<SidebarDocumentItem key={doc.id} document={doc} showActions={false} depth={1} />
					))}
				</SidebarFileSection>
			)}

			{thisWeekDocs.length > 0 && (
				<SidebarFileSection title="This Week">
					{thisWeekDocs.map((doc) => (
						<SidebarDocumentItem key={doc.id} document={doc} showActions={false} depth={1} />
					))}
				</SidebarFileSection>
			)}

			{thisMonthDocs.length > 0 && (
				<SidebarFileSection title="This Month">
					{thisMonthDocs.map((doc) => (
						<SidebarDocumentItem key={doc.id} document={doc} showActions={false} depth={1} />
					))}
				</SidebarFileSection>
			)}

			{olderDocs.length > 0 && (
				<SidebarFileSection title="Older">
					{olderDocs.map((doc) => (
						<SidebarDocumentItem key={doc.id} document={doc} showActions={false} depth={1} />
					))}
				</SidebarFileSection>
			)}
		</div>
	)
}
