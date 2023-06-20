export type InputCategory = {
	id: string
	title: string
	description: string
	groups: Group[]
}

export type InputSection = {
	id: string
	title: string
	description: string
	categories: InputCategory[]
}

export enum Status {
	Draft = 'draft',
	Published = 'published',
}
/** A tablekeyed by slug of generated markdown content for each item */
export type MarkdownContent = Record<string, string>

/** A table keyed by slug of articles. */
export type Articles = Record<string, Article>

export interface Section {
	/** The section's id */
	id: string
	/** The section's title */
	title: string
	/** A desscription of the section. */
	description: string
	/** A table keyed by category of each category. */
	categories: Category[]
}

export type Category = {
	/** The category's id */
	id: string
	/** The category's title */
	title: string
	/** A desscription of the category. */
	description: string
	/** An ordered array of articleIds that belong to this category. */
	articleIds: string[]
	groups: Group[]
}

export type Group = {
	id: string
	title: string
}

export interface Author {
	name: string
	image: string
	email: string
	twitter: string
}

export interface Article {
	/** The unique id or "slug" for this article. */
	id: string
	/** The id of the group to which this article belongs. */
	groupId: string
	/** The index of this article inside of the article's group. */
	groupIndex: number
	/** The id of the category to which this article belongs. */
	categoryId: string
	/** The index of this article inside of the article's category. */
	categoryIndex: number
	/** The id of the section to which this article belongs. */
	sectionId: string
	/** The index of this article inside of the article's section. */
	sectionIndex: number
	/** The article's display title. */
	title: string
	/** The article's display description (optional). */
	description: string | null
	/** The article's author details (optional). */
	author: Author | null
	/** The article's hero image (optional). */
	hero: string | null
	/** The article's status (draft, published, hidden, etc) */
	status: Status
	/** The date on which the article was published (optional). */
	date: string | null
	/** An array of keywords associated with this article. */
	keywords: string[]
	/** The URL where the article's source can be found. */
	sourceUrl: string
	/** The articleId of the next article in the category. */
	next: string | null
	/** The articleId of the previous article in the category. */
	prev: string | null
}

export type ArticleLinks = {
	prev: Article | null
	next: Article | null
}

export type SidebarContentSectionLink = {
	type: 'section'
	title: string
	url: string
	children: SidebarContentLink[]
}
export type SidebarContentCategoryLink = {
	type: 'category'
	title: string
	url: string
	children: SidebarContentLink[]
}
export type SidebarContentArticleLink = { type: 'article'; title: string; url: string }

export type SidebarContentLink =
	| SidebarContentSectionLink
	| SidebarContentCategoryLink
	| SidebarContentArticleLink

export type SidebarContentList = {
	sectionId: string | null
	categoryId: string | null
	articleId: string | null
	links: SidebarContentLink[]
}

export type GeneratedContent = { sections: Section[]; content: MarkdownContent; articles: Articles }
