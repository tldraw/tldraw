export interface CopyCodeData {
	page_category: string
	text_snippet: string
	page_url?: string
	copy_kind?: 'install_command' | 'code_snippet' | 'page_markdown'
	method?: 'button' | 'selection'
	language?: string
	chars?: number
	user_email?: string
	user_email_sha256?: string
	user_first_name?: string
	user_last_name?: string
	user_phone_number?: string
}

export interface CopyCodeEvent extends CopyCodeData {
	event_id: string
	timestamp: string
	page_path: string
	page_url: string
	page_section: 'homepage' | 'docs' | 'marketing' | 'other'
	copy_kind: NonNullable<CopyCodeData['copy_kind']>
}

export function createCopyEvent(data: CopyCodeData): CopyCodeEvent {
	let page = new URL(window.location.href)
	try {
		const captured = new URL(data.page_url ?? page.href)
		if (captured.origin === page.origin) page = captured
	} catch {
		/* Keep the current page if a caller supplies an invalid URL. */
	}
	const docs = [
		'/docs',
		'/examples',
		'/quick-start',
		'/reference',
		'/installation',
		'/releases',
		'/community',
		'/sdk-features',
		'/sdk-concepts',
		'/starter-kits',
		'/usage',
		'/introduction',
		'/getting-started',
		'/search',
		'/gen',
	]
	return {
		...data,
		event_id: crypto.randomUUID(),
		timestamp: new Date().toISOString(),
		page_path: page.pathname,
		page_url: page.origin + page.pathname,
		page_section:
			page.pathname === '/'
				? 'homepage'
				: docs.some((path) => page.pathname === path || page.pathname.startsWith(path + '/'))
					? 'docs'
					: page.hostname === 'tldraw.dev'
						? 'marketing'
						: 'other',
		copy_kind: data.copy_kind ?? 'code_snippet',
		chars: data.chars ?? data.text_snippet.length,
	}
}

// Explicitly select fields so copied text and form identity never enter these destinations.
export function copyEventMetadata(data: CopyCodeEvent) {
	return {
		event_id: data.event_id,
		timestamp: data.timestamp,
		page_path: data.page_path,
		page_url: data.page_url,
		page_section: data.page_section,
		copy_kind: data.copy_kind,
		page_category: data.page_category,
		...(data.method ? { method: data.method } : {}),
		...(data.language ? { language: data.language } : {}),
		...(data.chars !== undefined ? { chars: data.chars } : {}),
	}
}

export function isProspectId(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
	)
}
