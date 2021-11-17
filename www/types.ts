import { TDDocument } from '@tldraw/tldraw'
import { LiveObject } from '@liveblocks/client'

export interface TldrawStorage {
  doc: LiveObject<{ uuid: string; document: TDDocument }>
}

// Pages

export interface PageFrontmatter {
  title: string
}

export interface Page {
  slug: string
  content: string
  data: PageFrontmatter
}

// Posts

export interface PostFrontmatter {
  title: string
  date: string
  hero: string
  status: string
  description: string
}

export interface Post {
  index: number
  date: number
  slug: string
  content: string
  data: PostFrontmatter
}

export interface PostListItem {
  slug: string
  url: string
  data: PostFrontmatter
}

export type PostList = PostListItem[]

export type PostLinks = {
  prev: PostListItem | null
  next: PostListItem | null
}

// Guides

export interface GuideFrontmatter {
  title: string
  status: string
  description: string
  category: string
  order: number
}

export interface Guide {
  index: number
  slug: string
  content: string
  data: GuideFrontmatter
}

export interface GuideListItem {
  slug: string
  url: string
  data: GuideFrontmatter
}

export type GuideList = Record<
  string,
  {
    order: number
    category: string
    guides: GuideListItem[]
  }
>

export type GuideLinks = {
  prev: GuideListItem | null
  next: GuideListItem | null
}

// Content

export type Content = {
  pages: Page[]
  posts: Post[]
  guides: Guide[]
}
