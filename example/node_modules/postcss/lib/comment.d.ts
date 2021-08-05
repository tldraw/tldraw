import Container from './container.js'
import Node, { NodeProps } from './node.js'

interface CommentRaws {
  /**
   * The space symbols before the node.
   */
  before?: string

  /**
   * The space symbols between `/*` and the comment’s text.
   */
  left?: string

  /**
   * The space symbols between the comment’s text.
   */
  right?: string
}

export interface CommentProps extends NodeProps {
  /** Content of the comment. */
  text: string
  /** Information used to generate byte-to-byte equal node string as it was in the origin input. */
  raws?: CommentRaws
}

/**
 * Represents a comment between declarations or statements (rule and at-rules).
 *
 * ```js
 * Once (root, { Comment }) {
 *   let note = new Comment({ text: 'Note: …' })
 *   root.append(note)
 * }
 * ```
 *
 * Comments inside selectors, at-rule parameters, or declaration values
 * will be stored in the `raws` properties explained above.
 */
export default class Comment extends Node {
  type: 'comment'
  parent: Container | undefined
  raws: CommentRaws

  /**
   * The comment's text.
   */
  text: string

  constructor(defaults?: CommentProps)
  assign(overrides: object | CommentProps): this
  clone(overrides?: Partial<CommentProps>): this
  cloneBefore(overrides?: Partial<CommentProps>): this
  cloneAfter(overrides?: Partial<CommentProps>): this
}
