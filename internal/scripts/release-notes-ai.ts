/*
Purpose: to create a "first pass" human-readable set of release notes by collecting all commits since the last release.

Background:
Previously, I was doing this by running:
`git log origin/{MOST_RECENT_MINOR_RELEASE}..origin/main --pretty=format:"%h %s (%an, %ad)" --date=short > commit-log.txt`
...and then feeding the results into a model to expand upon each one. The models were missing individual commits and producing an incomplete work product.

Implementation:
The idea here is to:
1. Generate a list of all commits from github since the last release.
2. Iterate through the list, getting all information associated with the commit, including the diff, and then prompting an LLM to creating an entry.
3. Collect all entries and then summarize them.
4. Output the results as a markdown file.
*/

import { Octokit } from '@octokit/rest'
import * as fs from 'fs'
import OpenAI from 'openai'
import * as path from 'path'

// get .env variables
require('dotenv').config()

// Initialize GitHub client
const octokit = new Octokit({
	auth: process.env.GITHUB_TOKEN,
})

// Initialize OpenAI client
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
})

interface Commit {
	sha: string
	message: string
	author: string
	date: string
	diff: string
	prNumber?: number
	prLink?: string
	project?: 'sdk' | 'dotcom' | 'docs' | 'other'
}

interface CacheData {
	lastReleaseTag: string
	commits: Commit[]
	timestamp: number
}

const CACHE_FILE = path.join(process.cwd(), '.release-notes-cache.json')
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

function loadCache(): CacheData | null {
	try {
		if (!fs.existsSync(CACHE_FILE)) {
			return null
		}

		const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) as CacheData
		const now = Date.now()

		// Check if cache is expired
		if (now - cache.timestamp > CACHE_DURATION) {
			return null
		}

		return cache
	} catch (error) {
		console.warn('Failed to load cache:', error)
		return null
	}
}

function saveCache(lastReleaseTag: string, commits: Commit[]): void {
	try {
		const cache: CacheData = {
			lastReleaseTag,
			commits,
			timestamp: Date.now(),
		}
		fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
	} catch (error) {
		console.warn('Failed to save cache:', error)
	}
}

function determineProject(files: { filename: string }[]): 'sdk' | 'dotcom' | 'docs' | 'other' {
	const paths = files.map((f) => f.filename)

	if (paths.some((p) => p.startsWith('packages/'))) {
		return 'sdk'
	}
	if (paths.some((p) => p.startsWith('apps/dotcom/'))) {
		return 'dotcom'
	}
	if (paths.some((p) => p.startsWith('apps/docs/'))) {
		return 'docs'
	}
	return 'other'
}

async function getLastReleaseTag(): Promise<string> {
	const { data: releases } = await octokit.repos.listReleases({
		owner: 'tldraw',
		repo: 'tldraw',
	})

	if (!releases.length) {
		throw new Error('No releases found')
	}

	return releases[0].tag_name
}

async function getCommitsSinceLastRelease(lastReleaseTag: string): Promise<Commit[]> {
	// Try to load from cache first
	const cache = loadCache()
	if (cache && cache.lastReleaseTag === lastReleaseTag) {
		console.log('Using cached commits...')
		return cache.commits
	}

	console.log('Fetching commits from GitHub...')
	const { data: commits } = await octokit.repos.compareCommits({
		owner: 'tldraw',
		repo: 'tldraw',
		base: lastReleaseTag,
		head: 'main',
	})

	const commitDetails: Commit[] = []

	for (const commit of commits.commits) {
		const { data: diff } = await octokit.repos.getCommit({
			owner: 'tldraw',
			repo: 'tldraw',
			ref: commit.sha,
		})

		// Extract PR number from commit message
		const prMatch = commit.commit.message.match(/(?:fixes|closes|resolves) #(\d+)/i)
		const prNumber = prMatch ? parseInt(prMatch[1], 10) : undefined
		const prLink = prNumber ? `https://github.com/tldraw/tldraw/pull/${prNumber}` : undefined

		commitDetails.push({
			sha: commit.sha,
			message: commit.commit.message,
			author: commit.commit.author?.name || 'Unknown',
			date: commit.commit.author?.date || '',
			diff: diff.files?.map((f) => f.patch).join('\n') || '',
			prNumber,
			prLink,
			project: determineProject(diff.files || []),
		})
	}

	// Save to cache
	saveCache(lastReleaseTag, commitDetails)

	return commitDetails
}

async function generateCommitEntry(commit: Commit): Promise<string> {
	const prompt = `
    You are an expert technical editor. Your task is to create a release notes entry for the provided commit.
    
    Please ensure your entry:
    - Describes the changes in a way that is easy to understand.
    - Avoids superflous language or marketing speak, focus on the actual changes.
    - Is written in a unified, professional, and technical voice suitable for software developers.
    - Is concise and to the point, eliminating all unnecessary words or fluff.
    - Is well-formatted in Markdown, maintaining a clear and readable structure.
    - Is factually accurate based on the input, without adding new information or opinions.
    - Is polished, direct, and informative for a technical audience.
    - Begins each entry with a short sentence or title that captures the essence of the change.
    - Includes a link to the pull request if available.

    A good example should look like this:

    - **Zoom button**. Slightly increased the zoom button's padding on smaller breakpoints. [#123](https://github.com/tldraw/tldraw/pull/123)
    
    The commit details are as follows:
    
    Commit SHA: ${commit.sha}
    Author: ${commit.author}
    Date: ${commit.date}
    Message: ${commit.message}
    Diff: ${commit.diff}
    PR Link: ${commit.prLink}
    
    Format the response as a markdown bullet point.
  `

	const completion = await openai.chat.completions.create({
		messages: [{ role: 'user', content: prompt }],
		model: 'gpt-4-turbo-preview',
		temperature: 0.7,
	})

	const entry = completion.choices[0].message.content || ''

	// Add PR link if available
	if (commit.prNumber) {
		return `${entry} ([#${commit.prNumber}](https://github.com/tldraw/tldraw/pull/${commit.prNumber}))`
	}

	return entry
}

async function generateSummary(entries: (string | null)[]): Promise<string> {
	const prompt = `
    You are an expert technical editor. Your task is to create a summary of the provided release notes entries.
    
    Please ensure your summary:
    - Preserves the original meaning and intent of the entries.
    - Is concise and to the point, eliminating all unnecessary words or fluff.
    - Is well-formatted in Markdown, maintaining a clear and readable structure.
    - Is factually accurate based on the input, without adding new information or opinions.
    - Is polished, direct, and informative for a technical audience.
    - Follows the same format as the entries.

    A good example should look like this:

    - **Zoom button**. Slightly increased the zoom button's padding on smaller breakpoints. [#123](https://github.com/tldraw/tldraw/pull/123)
    
    Entries:
    ${entries.join('\n')}
    
    Format the response as a markdown section.
  `

	const completion = await openai.chat.completions.create({
		messages: [{ role: 'user', content: prompt }],
		model: 'gpt-4-turbo-preview',
		temperature: 0.7,
	})

	return completion.choices[0].message.content || ''
}

async function refineEntireReleaseNotes(originalReleaseNotes: string): Promise<string> {
	const prompt = `
    You are an expert technical editor. Your task is to refine the following complete release notes document.
    Please ensure the entire document is:
    1. Concise and to the point, eliminating all unnecessary words or fluff throughout.
    2. Written in a unified, professional, and technical voice suitable for software developers across all sections.
    3. Factually accurate based on the input, without adding new information or opinions.
    4. Free of marketing jargon or overly enthusiastic language.
    5. Well-formatted in Markdown. IMPORTANT: Preserve the overall structure, including the "## Summary" section and the "## Changes" section with its "### [Project Name]" subheadings. Do not alter these main structural elements.
    6. REMOVE ALL references to missing information, e.g. "No PR provided".

    The goal is a polished, direct, and informative release notes document for a technical audience.

    Original Release Notes Document to Refine:
    ------------------------------------------
    ${originalReleaseNotes}
    ------------------------------------------

    Refined Release Notes Document:
  `

	const completion = await openai.chat.completions.create({
		messages: [{ role: 'user', content: prompt }],
		model: 'gpt-4-turbo-preview', // Consider gpt-4 for potentially better structural preservation and nuanced editing of a whole document.
		temperature: 0.5, // Lower temperature for more deterministic, focused editing.
	})

	return completion.choices[0].message.content || originalReleaseNotes // Fallback to original if refinement fails
}

async function main() {
	try {
		// Get the last release tag
		const lastReleaseTag = await getLastReleaseTag()
		console.log(`Generating release notes since ${lastReleaseTag}...`)

		// Get all commits since last release
		const commits = await getCommitsSinceLastRelease(lastReleaseTag)
		console.log(`Found ${commits.length} commits`)

		let i = commits.length

		// Generate entries for each commit
		const entries = await Promise.allSettled(
			commits.map(async (commit) => {
				console.log(`Processing commit ${commit.sha}...`)
				const entry = await generateCommitEntry(commit)
				console.log(`Completed commit ${commit.sha} (${i--} remaining)`)
				return { entry, project: commit.project }
			})
		)
			.then((r) => r.map((r) => (r.status === 'fulfilled' ? r.value : null)))
			.then((r) =>
				r.filter(
					(r): r is { entry: string; project: 'sdk' | 'dotcom' | 'docs' | 'other' } => r !== null
				)
			)

		// Group entries by project
		const groupedEntries = entries.reduce(
			(acc, { entry, project }) => {
				if (!acc[project]) acc[project] = []
				acc[project].push(entry)
				return acc
			},
			{} as Record<string, string[]>
		)

		// Generate initial summary
		const initialSummary = await generateSummary(entries.map(({ entry }) => entry))
		console.log('Initial summary generated.')

		// Combine everything into an initial markdown document
		const initialReleaseNotes = `# Release Notes

## Summary
${initialSummary}

## Changes

### tldraw SDK
${groupedEntries.sdk?.join('\n') || 'No SDK changes'}

### tldraw.com
${groupedEntries.dotcom?.join('\n') || 'No dotcom changes'}

### tldraw.dev
${groupedEntries.docs?.join('\n') || 'No docs changes'}

### Other Changes
${groupedEntries.other?.join('\n') || 'No other changes'}
`

		console.log('Initial release notes assembled. Refining entire document...')
		// Refine the entire release notes document
		const finalReleaseNotes = await refineEntireReleaseNotes(initialReleaseNotes)
		console.log('Entire release notes document refined.')

		// Write to file
		const outputPath = path.join(process.cwd(), 'release-notes.md')
		fs.writeFileSync(outputPath, finalReleaseNotes)
		console.log(`Release notes written to ${outputPath}`)
	} catch (error) {
		console.error('Error generating release notes:', error)
		process.exit(1)
	}
}

main()
