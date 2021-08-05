import type { Node as EstreeNode } from 'estree'
import type { Mapping, SourceMapGenerator } from 'source-map'
import type { Writable } from 'stream'

/**
 * State object passed to generator functions.
 */
export interface State {
  output: string
  write(code: string): void
  writeComments: boolean
  indent: string
  lineEnd: string
  indentLevel: number
  line?: number
  column?: number
  lineEndSize?: number
  mapping?: Mapping
}

/**
 * Code generator for each node type.
 */
export type Generator = {
  [T in EstreeNode['type']]: (
    node: EstreeNode & { type: T },
    state: State,
  ) => void
}

/**
 * Code generator options.
 */
export interface Options<Output = null> {
  /**
   * If present, source mappings will be written to the generator.
   */
  sourceMap?: SourceMapGenerator
  /**
   * String to use for indentation, defaults to `"␣␣"`.
   */
  indent?: string
  /**
   * String to use for line endings, defaults to `"\n"`.
   */
  lineEnd?: string
  /**
   * Indent level to start from, defaults to `0`.
   */
  startingIndentLevel?: number
  /**
   * Generate comments if `true`, defaults to `false`.
   */
  comments?: boolean
  /**
   * Output stream to write the render code to, defaults to `null`.
   */
  output?: Output
  /**
   * Custom code generator logic.
   */
  generator?: Generator
}

/**
 * Core Estree Node type to accommodate derived node types from parsers.
 */
interface Node {
  type: string
}

/**
 * Returns a string representing the rendered code of the provided AST `node`.
 * However, if an `output` stream is provided in the `options`, it writes to that stream and returns it.
 */
export function generate(node: Node, options?: Options<null>): string
export function generate(node: Node, options?: Options<Writable>): Writable

/**
 * Base code generator.
 */
export const GENERATOR: Generator;
