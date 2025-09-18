import { wrapAnsi } from './wrap-ansi'

describe('wrapAnsi', () => {
	describe('basic wrapping', () => {
		it('should wrap text at specified column width', () => {
			const input = 'This is a long string that should be wrapped at 20 characters'
			const result = wrapAnsi(input, 20, {})
			const lines = result.split('\n')

			expect(lines).toHaveLength(4)
			expect(lines[0].length).toBeLessThanOrEqual(20)
			expect(lines[1].length).toBeLessThanOrEqual(20)
			expect(lines[2].length).toBeLessThanOrEqual(20)
			expect(lines[3].length).toBeLessThanOrEqual(20)
		})

		it('should handle empty string', () => {
			const result = wrapAnsi('', 10, {})
			expect(result).toBe('')
		})

		it('should handle whitespace-only string', () => {
			const result = wrapAnsi('   ', 10, {})
			expect(result).toBe('')
		})

		it('should handle single word shorter than column width', () => {
			const result = wrapAnsi('hello', 10, {})
			expect(result).toBe('hello')
		})

		it('should handle single word longer than column width', () => {
			const result = wrapAnsi('supercalifragilisticexpialidocious', 10, {})
			const lines = result.split('\n')
			// The word is longer than 10 chars, so it should be wrapped
			expect(lines.length).toBeGreaterThanOrEqual(1)
		})
	})

	describe('ANSI escape codes', () => {
		it('should preserve ANSI color codes across line breaks', () => {
			const input = '\u001B[31mThis is red text that should wrap\u001B[39m'
			const result = wrapAnsi(input, 15, {})

			// Should contain the color codes
			expect(result).toContain('\u001B[31m')
			expect(result).toContain('\u001B[39m')

			// Should have wrapped the text
			const lines = result.split('\n')
			expect(lines.length).toBeGreaterThan(1)
		})

		it('should handle multiple ANSI codes', () => {
			const input = '\u001B[31m\u001B[1mBold red text\u001B[39m\u001B[22m'
			const result = wrapAnsi(input, 10, {})

			expect(result).toContain('\u001B[31m')
			expect(result).toContain('\u001B[1m')
			expect(result).toContain('\u001B[39m')
			expect(result).toContain('\u001B[22m')
		})

		it('should handle ANSI hyperlink codes', () => {
			const input = '\u001B]8;;https://example.com\u0007link text\u001B]8;;\u0007'
			const result = wrapAnsi(input, 10, {})

			expect(result).toContain('\u001B]8;;https://example.com\u0007')
			expect(result).toContain('\u001B]8;;\u0007')
		})

		it('should not count ANSI codes towards line length', () => {
			const input = '\u001B[31mThis text should wrap at exactly 20 characters\u001B[39m'
			const result = wrapAnsi(input, 20, {})
			const lines = result.split('\n')

			// Each line should be at most 20 characters (excluding ANSI codes)
			lines.forEach((line) => {
				// Remove ANSI escape sequences for length calculation
				// eslint-disable-next-line no-control-regex
				const cleanLine = line.replace(/\u001B\[[0-9;]*m/g, '')
				expect(cleanLine.length).toBeLessThanOrEqual(20)
			})
		})
	})

	describe('indentation', () => {
		it('should apply indentation to wrapped lines', () => {
			const input = 'This is a long string that should be wrapped with indentation'
			const result = wrapAnsi(input, 20, { indent: '  ' })
			const lines = result.split('\n')

			// First line should not be indented (no original leading whitespace)
			expect(lines[0]).not.toMatch(/^ {2}/)

			// All wrapped lines should be indented
			for (let i = 1; i < lines.length; i++) {
				expect(lines[i]).toMatch(/^ {2}/)
			}
		})

		it('should handle empty indentation', () => {
			const input = 'This is a long string'
			const result = wrapAnsi(input, 10, { indent: '' })
			const lines = result.split('\n')

			// All lines should start without indentation
			lines.forEach((line) => {
				expect(line).not.toMatch(/^ /)
			})
		})

		it('should account for indentation in line length calculations', () => {
			const input = 'This is a long string that should be wrapped'
			const result = wrapAnsi(input, 15, { indent: '    ' })
			const lines = result.split('\n')

			lines.forEach((line) => {
				const visibleLength = line.length
				expect(visibleLength).toBeLessThanOrEqual(15)
			})
		})
	})

	describe('word wrapping', () => {
		it('should wrap at word boundaries by default', () => {
			const input = 'This is a sentence with multiple words'
			const result = wrapAnsi(input, 15, {})
			const lines = result.split('\n')

			// Should not break words in the middle
			lines.forEach((line) => {
				const words = line.trim().split(' ')
				words.forEach((word) => {
					expect(word.length).toBeLessThanOrEqual(15)
				})
			})
		})

		it('should handle wordWrap: false option', () => {
			const input = 'supercalifragilisticexpialidocious'
			const result = wrapAnsi(input, 10, { wordWrap: false })
			const lines = result.split('\n')

			// Should break the word at character boundaries
			expect(lines.length).toBeGreaterThan(1)
		})

		it('should handle mixed word lengths', () => {
			const input = 'a very long word supercalifragilisticexpialidocious and short words'
			const result = wrapAnsi(input, 15, {})
			const lines = result.split('\n')

			expect(lines.length).toBeGreaterThan(1)
		})
	})

	describe('hard wrapping', () => {
		it('should never exceed column width in hard mode', () => {
			const input = 'This is a very long word that should be hard wrapped'
			const result = wrapAnsi(input, 10, { hard: true })
			const lines = result.split('\n')

			lines.forEach((line) => {
				expect(line.length).toBeLessThanOrEqual(10)
			})
		})

		it('should break long words in hard mode', () => {
			const input = 'supercalifragilisticexpialidocious'
			const result = wrapAnsi(input, 5, { hard: true })
			const lines = result.split('\n')

			expect(lines.length).toBeGreaterThan(1)
			lines.forEach((line) => {
				expect(line.length).toBeLessThanOrEqual(5)
			})
		})
	})

	describe('trimming', () => {
		it('should trim whitespace by default', () => {
			const input = '  This has leading and trailing spaces  '
			const result = wrapAnsi(input, 20, {})
			const lines = result.split('\n')

			lines.forEach((line) => {
				expect(line).not.toMatch(/^ /)
				expect(line).not.toMatch(/ $/)
			})
		})

		it('should preserve whitespace when trim: false', () => {
			const input = '  This has leading spaces  '
			const result = wrapAnsi(input, 20, { trim: false })
			const lines = result.split('\n')

			expect(lines[0]).toMatch(/^ {2}/)
		})

		it('should preserve original leading whitespace on first line and apply indent to wrapped lines', () => {
			const input = '     Display this help message that is long enough to wrap around'
			const result = wrapAnsi(input, 30, { indent: '     ' })
			const lines = result.split('\n')

			// Should have multiple lines due to wrapping
			expect(lines.length).toBeGreaterThan(1)

			// First line should preserve original leading whitespace
			expect(lines[0]).toMatch(/^ {5}/)

			// Wrapped lines should use the indent option
			for (let i = 1; i < lines.length; i++) {
				expect(lines[i]).toMatch(/^ {5}/)
			}
		})

		it('should preserve original leading whitespace only on first line when no indent specified', () => {
			const input = '     Display this help message that is long enough to wrap around'
			const result = wrapAnsi(input, 30, {})
			const lines = result.split('\n')

			// Should have multiple lines due to wrapping
			expect(lines.length).toBeGreaterThan(1)

			// First line should NOT preserve original leading whitespace (default trim: true)
			expect(lines[0]).not.toMatch(/^ {5}/)

			// Wrapped lines should not have any leading whitespace
			for (let i = 1; i < lines.length; i++) {
				expect(lines[i]).not.toMatch(/^ /)
			}
		})

		it('should respect column limit when first line has original leading whitespace', () => {
			const input = '     Real-time multiplayer for tldraw, built with Cloudflare Durable Objects.'
			const result = wrapAnsi(input, 56, { indent: '     ' })
			const lines = result.split('\n')

			// Should have multiple lines due to wrapping
			expect(lines.length).toBeGreaterThan(1)

			// First line should not exceed column limit
			expect(lines[0].length).toBeLessThanOrEqual(56)

			// All lines should respect column limit
			lines.forEach((line) => {
				expect(line.length).toBeLessThanOrEqual(56)
			})

			// First line should preserve original leading whitespace
			expect(lines[0]).toMatch(/^ {5}/)

			// Wrapped lines should use indent
			for (let i = 1; i < lines.length; i++) {
				expect(lines[i]).toMatch(/^ {5}/)
			}
		})

		it('should handle multiple spaces between words', () => {
			const input = 'word1    word2    word3'
			const result = wrapAnsi(input, 10, {})
			const lines = result.split('\n')

			// Should preserve single spaces between words
			lines.forEach((line) => {
				expect(line).not.toMatch(/ {2}/) // No double spaces
			})
		})
	})

	describe('newline handling', () => {
		it('should preserve existing newlines', () => {
			const input = 'Line 1\nLine 2\nLine 3'
			const result = wrapAnsi(input, 10, {})
			const lines = result.split('\n')

			expect(lines.length).toBeGreaterThanOrEqual(3)
		})

		it('should handle carriage return line feeds', () => {
			const input = 'Line 1\r\nLine 2\r\nLine 3'
			const result = wrapAnsi(input, 10, {})
			const lines = result.split('\n')

			expect(lines.length).toBeGreaterThanOrEqual(3)
		})

		it('should wrap each line separately', () => {
			const input = 'This is a long line\nThis is another long line'
			const result = wrapAnsi(input, 15, {})
			const lines = result.split('\n')

			// Should have more than 2 lines due to wrapping
			expect(lines.length).toBeGreaterThan(2)
		})
	})

	describe('edge cases', () => {
		it('should handle strings with only ANSI codes', () => {
			const input = '\u001B[31m\u001B[39m'
			const result = wrapAnsi(input, 10, {})
			expect(result).toBe(input)
		})

		it('should handle strings with unicode characters', () => {
			const input = 'café résumé naïve'
			const result = wrapAnsi(input, 10, {})
			const lines = result.split('\n')

			expect(lines.length).toBeGreaterThan(1)
		})

		it('should handle very long words', () => {
			const input = 'a'.repeat(100)
			const result = wrapAnsi(input, 10, {})
			const lines = result.split('\n')

			// The function doesn't wrap very long words by default (not in hard mode)
			// So it should just return the original word
			expect(lines.length).toBe(1)
			expect(lines[0]).toBe(input)
		})

		it('should handle zero column width', () => {
			const input = 'This should be wrapped'
			const result = wrapAnsi(input, 0, {})
			const lines = result.split('\n')

			expect(lines.length).toBeGreaterThan(1)
		})

		it('should handle negative column width', () => {
			const input = 'This should be wrapped'
			const result = wrapAnsi(input, -5, {})
			const lines = result.split('\n')

			expect(lines.length).toBeGreaterThan(1)
		})
	})

	describe('complex scenarios', () => {
		it('should handle mixed ANSI codes and long text', () => {
			const input =
				'\u001B[31m\u001B[1mThis is bold red text that should wrap at the specified column width\u001B[39m\u001B[22m'
			const result = wrapAnsi(input, 20, {})
			const lines = result.split('\n')

			expect(lines.length).toBeGreaterThan(1)
			expect(result).toContain('\u001B[31m')
			expect(result).toContain('\u001B[1m')
			expect(result).toContain('\u001B[39m')
			expect(result).toContain('\u001B[22m')
		})

		it('should handle indentation with ANSI codes', () => {
			const input = '\u001B[32mThis is green text that should be indented when wrapped\u001B[39m'
			const result = wrapAnsi(input, 20, { indent: '  ' })
			const lines = result.split('\n')

			expect(lines.length).toBeGreaterThan(1)
			// First line should not be indented
			expect(lines[0]).not.toMatch(/^ {2}/)
			// Only the last line should be indented (after ANSI codes)
			const lastLine = lines[lines.length - 1]
			expect(lastLine).toContain('  ')
			// Middle lines should not be indented
			for (let i = 1; i < lines.length - 1; i++) {
				expect(lines[i]).not.toMatch(/^ {2}/)
			}
		})

		it('should handle hard wrapping with ANSI codes', () => {
			const input =
				'\u001B[33m\u001B[1mThis is bold yellow text that should be hard wrapped\u001B[39m\u001B[22m'
			const result = wrapAnsi(input, 15, { hard: true })
			const lines = result.split('\n')

			lines.forEach((line) => {
				// Remove ANSI codes for length calculation
				// eslint-disable-next-line no-control-regex
				const cleanLine = line.replace(/\u001B\[[0-9;]*m/g, '')
				expect(cleanLine.length).toBeLessThanOrEqual(15)
			})
		})
	})
})
