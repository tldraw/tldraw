import prettier from 'prettier/standalone'
import parserTypeScript from 'prettier/parser-typescript'
import { CodeError } from 'types'

/**
 * Format code with prettier
 * @param code
 */
export function getFormattedCode(code: string): string {
  return prettier.format(code, {
    parser: 'typescript',
    plugins: [parserTypeScript],
    singleQuote: true,
    trailingComma: 'es5',
    semi: false,
  })
}

/**
 * Get line and column from error.
 * @param e
 */
export const getErrorWithLineAndColumn = (e: Error | any): CodeError => {
  if ('line' in e) {
    return { message: e.message, line: Number(e.line), column: e.column }
  }

  const result = e.stack.split('/n')[0].match(/(.*)\(([0-9]+):([0-9]+)/)

  if (result) {
    return {
      message: result[1],
      line: Number(result[2]) + 1,
      column: result[3],
    }
  } else {
    return {
      message: e.message,
      line: null,
      column: null,
    }
  }
}
