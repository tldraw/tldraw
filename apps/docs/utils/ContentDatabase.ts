import { connect } from '@/scripts/lib/connect'
import { assert } from '@tldraw/utils'
import { Database } from 'sqlite'
import sqlite3 from 'sqlite3'
import {
	Article,
	ArticleHeading,
	ArticleLinks,
	Category,
	Section,
	SidebarContentArticleLink,
	SidebarContentCategoryLink,
	SidebarContentLink,
	SidebarContentList,
} from '../types/content-types'

export class ContentDatabase {
	private dbPromise: Promise<Database<sqlite3.Database, sqlite3.Statement>> | null = null

	async getDb() {
		if (!this.dbPromise) {
			this.dbPromise = connect({ mode: 'readonly' })
		}

		return this.dbPromise
	}

	async getAllPaths(): Promise<string[]> {
		const db = await this.getDb()
		const articles = await db.all(`SELECT path FROM articles`)
		return articles.map((article) => article.path)
	}

	async getPageContent(
		path: string
	): Promise<
		| { type: 'section'; section: Section }
		| { type: 'category'; category: Category }
		| { type: 'article'; article: Article }
		| undefined
	> {
		const db = await this.getDb()
		const section = await db.get(`SELECT * FROM sections WHERE sections.path = ?`, path)
		if (section) return { type: 'section', section } as const

		const category = await db.get(`SELECT * FROM categories WHERE categories.path = ?`, path)
		if (category) return { type: 'category', category } as const

		const article = await db.get(`SELECT * FROM articles WHERE articles.path = ?`, path)
		if (article) return { type: 'article', article } as const

		return undefined
	}

	async getSection(sectionId: string, opts = {} as { optional?: boolean }) {
		const db = await this.getDb()
		const section = await db.get('SELECT * FROM sections WHERE id = ?', sectionId)
		if (!opts.optional) assert(section, `Could not find a section with sectionId ${sectionId}`)
		return section
	}

	async getCategory(categoryId: string, opts = {} as { optional?: boolean }): Promise<Category> {
		const db = await this.getDb()
		const category = await db.get('SELECT * FROM categories WHERE id = ?', categoryId)
		if (!opts.optional) assert(category, `Could not find a category with categoryId ${categoryId}`)
		return category
	}

	async getArticleHeadings(articleId: string): Promise<ArticleHeading[]> {
		const db = await this.getDb()

		const headings = await db.all<ArticleHeading[]>(
			`SELECT * FROM headings WHERE headings.articleId = ? ORDER BY idx ASC`,
			articleId
		)
		assert(headings, `Could not find headings for an article with articleId ${articleId}`)
		return headings
	}

	async getCategoriesForSection(sectionId: string, opts = {} as { optional?: boolean }) {
		const db = await this.getDb()
		const categories = await db.all<Category[]>(
			'SELECT * FROM categories WHERE sectionId = ?',
			sectionId
		)
		if (!opts.optional) assert(categories, `Could not find categories for sectionId ${sectionId}`)
		return categories
	}

	async getCategoryArticles(sectionId: string, categoryId: string) {
		const db = await this.getDb()
		const articles = await db.all<Article[]>(
			'SELECT id, title, description, sectionId, categoryId, authorId, priority, hero, thumbnail, socialImage, date, path FROM articles WHERE sectionId = ? AND categoryId = ?',
			sectionId,
			categoryId
		)
		assert(articles, `Could not find articles for category with categoryId ${categoryId}`)
		return articles
	}

	async getArticleLinks(article: Article): Promise<ArticleLinks> {
		const db = await this.getDb()

		// and the article with the same section but next sectionIndex
		const { sectionIndex } = article

		// the prev is the article with the same section but one less sectionIndex
		let prev = await db.get<Article>(
			`SELECT id, title, categoryId, sectionId, path FROM articles
			   WHERE articles.sectionId = ?
				   AND ((articles.groupId = ? AND ? IS NOT NULL) OR (articles.groupId IS NULL AND ? is NULL))
					 AND articles.sectionIndex < ? 
			   ORDER BY articles.sectionIndex DESC LIMIT 1`,
			article.sectionId,
			article.groupId,
			article.groupId,
			article.groupId,
			sectionIndex
		)

		// If there's no next, then get the LAST article from the prev section
		if (!prev) {
			const { idx } = await db.get(
				`SELECT idx FROM sections WHERE sections.id = ?`,
				article.sectionId
			)

			const prevSection = await db.get(`SELECT id FROM sections WHERE sections.idx = ?`, idx - 1)
			if (prevSection) {
				const { id: prevSectionId } = prevSection
				// get the article with the section id and the highest section index
				prev = await db.get<Article>(
					// here we only need certian info for the link
					`SELECT id, title, categoryId, sectionId, path FROM articles
					   WHERE articles.sectionId = ?
					   ORDER BY articles.sectionIndex DESC LIMIT 1`,
					prevSectionId
				)
			}
		}

		// the next is the article with the same section but next sectionIndex
		let next = await db.get<Article>(
			`SELECT id, title, categoryId, sectionId, path FROM articles
			   WHERE articles.sectionId = ?
				   AND ((articles.groupId = ? AND ? IS NOT NULL) OR (articles.groupId IS NULL AND ? is NULL))
					 AND articles.sectionIndex > ?
			   ORDER BY articles.sectionIndex ASC LIMIT 1`,
			article.sectionId,
			article.groupId,
			article.groupId,
			article.groupId,
			sectionIndex
		)

		// If there's no next, then get the FIRST article from the next section
		if (!next) {
			const { idx } = await db.get(
				`SELECT idx FROM sections WHERE sections.id = ?`,
				article.sectionId
			)

			const nextSection = await db.get(`SELECT id FROM sections WHERE sections.idx = ?`, idx + 1)

			if (nextSection) {
				const { id: nextSectionId } = nextSection
				next = await db.get<Article>(
					`SELECT id, title, categoryId, sectionId, path FROM articles
					 	 WHERE articles.sectionId = ?
						 ORDER BY articles.sectionIndex ASC LIMIT 1`,
					nextSectionId
				)
			}
		}

		return { prev: prev ?? null, next: next ?? null }
	}

	// TODO(mime): make this more generic, not per docs area
	private _sidebarContentLinks: SidebarContentLink[] | undefined
	private _sidebarReferenceContentLinks: SidebarContentLink[] | undefined
	private _sidebarExamplesContentLinks: SidebarContentLink[] | undefined

	async getSidebarContentList({
		sectionId,
		categoryId,
		articleId,
	}: {
		sectionId?: string
		categoryId?: string
		articleId?: string
	}): Promise<SidebarContentList> {
		let links: SidebarContentLink[]

		const cachedLinks =
			sectionId === 'examples'
				? this._sidebarExamplesContentLinks
				: sectionId === 'reference'
					? this._sidebarReferenceContentLinks
					: this._sidebarContentLinks
		if (cachedLinks && process.env.NODE_ENV !== 'development') {
			// Use the previously cached sidebar links
			links = cachedLinks
		} else {
			const db = await this.getDb()
			// Generate sidebar links and cache them
			links = []

			const sections = await db.all<Section[]>('SELECT * FROM sections ORDER BY idx ASC')

			for (const section of sections) {
				if (!section.path) continue

				const children: SidebarContentLink[] = []

				if (section.sidebar_behavior === 'hidden') {
					continue
				}

				if (
					(sectionId === 'reference' && section.id !== 'reference') ||
					(sectionId !== 'reference' && section.id === 'reference')
				) {
					continue
				}

				if (
					(sectionId === 'examples' && section.id !== 'examples') ||
					(sectionId !== 'examples' && section.id === 'examples')
				) {
					continue
				}

				if (section.sidebar_behavior === 'show-title') {
					links.push({
						type: 'article',
						title: section.title,
						url: section.path,
						articleId: section.id,
						groupId: null,
					})
					continue
				}

				const categoriesForSection = await db.all<Category[]>(
					`SELECT * FROM categories WHERE categories.sectionId = ? ORDER BY sectionIndex ASC`,
					section.id
				)

				const ucg: SidebarContentLink[] = []

				for (const category of categoriesForSection) {
					const articlesForCategory = await db.all<Article[]>(
						`SELECT * FROM articles WHERE articles.categoryId = ? ORDER BY categoryIndex ASC`,
						category.id
					)

					if (category.id === section.id + '_ucg') {
						// Push uncategorized articles to the child of the section
						for (const article of articlesForCategory) {
							if (!article.path) continue
							const sidebarArticleLink: SidebarContentArticleLink = {
								type: 'article',
								articleId: article.id,
								title: article.sidebarTitle ?? article.title,
								url: article.path,
								groupId: article.groupId,
							}

							ucg.push(sidebarArticleLink)
						}
					} else {
						if (!category.path) continue

						// Push a category together to the section's children
						const sidebarCategoryLink: SidebarContentCategoryLink = {
							type: 'category',
							title: category.title,
							url: category.path,
							children: [],
						}

						children.push(sidebarCategoryLink)

						for (const article of articlesForCategory) {
							if (!article.path) continue

							// Add the category's child articles to the category
							const sidebarArticleLink: SidebarContentArticleLink = {
								type: 'article' as const,
								articleId: article.id,
								groupId: article.groupId,
								title: article.title,
								url: article.path,
							}

							sidebarCategoryLink.children.push(sidebarArticleLink)
						}
					}
				}

				// Add the uncategorized articles to the end of the section
				children.push(...ucg)

				// Push the section to the sidebar
				links.push({ type: 'section', title: section.title, url: section.path, children })

				// Cache the links structure for next time
				if (sectionId === 'examples') {
					this._sidebarExamplesContentLinks = links
				} else if (sectionId === 'reference') {
					this._sidebarReferenceContentLinks = links
				} else {
					this._sidebarContentLinks = links
				}
			}
		}

		return {
			sectionId: sectionId ?? null,
			categoryId: categoryId ?? null,
			articleId: articleId ?? null,
			links,
		}
	}
}

export const db = new ContentDatabase()
