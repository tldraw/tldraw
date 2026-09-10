import console from 'console'
import type { Database } from 'sqlite'
import type sqlite3 from 'sqlite3'
import type { Article, GeneratedContent } from '@/types/content-types'
import { parseMarkdown } from './parse-markdown'

export async function addContentToDb(
	db: Database<sqlite3.Database, sqlite3.Statement>,
	content: GeneratedContent
) {
	// One transaction for the whole batch: each statement is otherwise its own autocommit with
	// an fsync, which turns the ~13k inserts of a refresh into seconds of wall time.
	await db.exec('BEGIN')
	try {
		await insertContent(db, content)
		await db.exec('COMMIT')
	} catch (e) {
		// Don't let a failed rollback mask the insert error
		await db.exec('ROLLBACK').catch(() => {})
		throw e
	}
}

async function insertContent(
	db: Database<sqlite3.Database, sqlite3.Statement>,
	content: GeneratedContent
) {
	const sectionInsert = await db.prepare(
		`INSERT INTO sections (id, idx, title, description, path, sidebar_behavior) VALUES (?, ?, ?, ?, ?, ?)`
	)

	const categoryInsert = await db.prepare(
		`INSERT INTO categories (id, title, description, sectionId, sectionIndex, path) VALUES (?, ?, ?, ?, ?, ?)`
	)

	const headingsInsert = await db.prepare(
		`INSERT INTO headings (idx, articleId, level, title, slug, path) VALUES (?, ?, ?, ?, ?, ?)`
	)

	const articleInsert = await db.prepare(
		`INSERT INTO articles (
      id,
      groupIndex,
      categoryIndex,
	  priority,
      sectionIndex,
      groupId,
      categoryId,
      sectionId,
      authorId,
      title,
	  sidebarTitle,
      description,
      hero,
	  thumbnail,
	  socialImage,
      status,
      date,
      sourceUrl,
			componentCode,
			componentCodeFilename,
			componentCodeFiles,
      keywords,
	  apiTags,
      content,
			path,
			embed,
			githubLink
    ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	)

	for (let i = 0; i < content.sections.length; i++) {
		const section = content.sections[i]
		try {
			await sectionInsert.run(
				section.id,
				section.id === 'reference' ? 99999 : i,
				section.title,
				section.description,
				section.path,
				section.sidebar_behavior
			)

			for (let c = 0; c < section.categories.length; c++) {
				const category = section.categories[c]
				await categoryInsert.run(
					category.id,
					category.title,
					category.description,
					section.id,
					c,
					category.path
				)
			}
		} catch (e: any) {
			throw Error(`could not add section to db, ${section.id}: ${e.message}`)
		}
	}

	const articles = Object.values(content.articles) as Article[]

	for (let i = 0; i < articles.length; i++) {
		const article = articles[i]
		if (!article.id) {
			throw Error(`hey, article ${article.id} has no id`)
		}

		try {
			await articleInsert.run(
				article.id,
				article.groupIndex,
				article.categoryIndex,
				article.priority,
				article.sectionIndex,
				article.groupId,
				article.categoryId,
				article.sectionId,
				article.author
					? typeof article.author === 'string'
						? article.author
						: article.author.join(', ')
					: null,
				article.title,
				article.sidebarTitle,
				article.description,
				article.hero,
				article.thumbnail,
				article.socialImage,
				article.status,
				article.date,
				article.sourceUrl,
				article.componentCode,
				article.componentCodeFilename,
				article.componentCodeFiles,
				article.keywords.join(', '),
				article.apiTags,
				article.content,
				article.path,
				article.embed,
				article.githubLink
			)
		} catch (e: any) {
			console.error(`ERROR: Could not add article with id '${article.id}'`)
			throw e
		}

		await Promise.all(
			parseMarkdown(article.content ?? '', article.path ?? article.id).headings.map((heading, i) =>
				headingsInsert.run(
					i,
					article.id,
					heading.level,
					heading.title,
					heading.slug,
					heading.slug ? `${article.path}#${heading.slug}` : article.path
				)
			)
		)
	}

	await Promise.all([
		sectionInsert.finalize(),
		categoryInsert.finalize(),
		headingsInsert.finalize(),
		articleInsert.finalize(),
	])
}
