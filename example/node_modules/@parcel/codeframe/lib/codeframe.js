"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = codeFrame;

function _chalk() {
  const data = _interopRequireDefault(require("chalk"));

  _chalk = function () {
    return data;
  };

  return data;
}

function _emphasize() {
  const data = _interopRequireDefault(require("emphasize"));

  _emphasize = function () {
    return data;
  };

  return data;
}

function _stringWidth() {
  const data = _interopRequireDefault(require("string-width"));

  _stringWidth = function () {
    return data;
  };

  return data;
}

function _sliceAnsi() {
  const data = _interopRequireDefault(require("slice-ansi"));

  _sliceAnsi = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const NEWLINE = /\r\n|[\n\r\u2028\u2029]/;
const TAB_REPLACE_REGEX = /\t/g;
const TAB_REPLACEMENT = '  ';
const DEFAULT_TERMINAL_WIDTH = 80;

const highlightSyntax = (txt, lang) => {
  if (lang) {
    try {
      return _emphasize().default.highlight(lang, txt).value;
    } catch (e) {// fallback for unknown languages...
    }
  }

  return _emphasize().default.highlightAuto(txt).value;
};

function codeFrame(code, highlights, inputOpts = {}) {
  var _inputOpts$maxLines;

  if (highlights.length < 1) return '';
  let opts = {
    useColor: !!inputOpts.useColor,
    syntaxHighlighting: !!inputOpts.syntaxHighlighting,
    language: inputOpts.language,
    maxLines: (_inputOpts$maxLines = inputOpts.maxLines) !== null && _inputOpts$maxLines !== void 0 ? _inputOpts$maxLines : 12,
    terminalWidth: inputOpts.terminalWidth || DEFAULT_TERMINAL_WIDTH,
    padding: inputOpts.padding || {
      before: 1,
      after: 2
    }
  }; // Highlights messages and prefixes when colors are enabled

  const highlighter = (s, bold) => {
    if (opts.useColor) {
      let redString = _chalk().default.red(s);

      return bold ? _chalk().default.bold(redString) : redString;
    }

    return s;
  }; // Prefix lines with the line number


  const lineNumberPrefixer = params => {
    let {
      lineNumber,
      lineNumberLength,
      isHighlighted
    } = params;
    return `${isHighlighted ? highlighter('>') : ' '} ${lineNumber ? lineNumber.padStart(lineNumberLength, ' ') : ' '.repeat(lineNumberLength)} | `;
  }; // Make columns/lines start at 1


  highlights = highlights.map(h => {
    return {
      start: {
        column: h.start.column - 1,
        line: h.start.line - 1
      },
      end: {
        column: h.end.column - 1,
        line: h.end.line - 1
      },
      message: h.message
    };
  }); // Find first and last highlight

  let firstHighlight = highlights.length > 1 ? highlights.sort((a, b) => a.start.line - b.start.line)[0] : highlights[0];
  let lastHighlight = highlights.length > 1 ? highlights.sort((a, b) => b.end.line - a.end.line)[0] : highlights[0]; // Calculate first and last line index of codeframe

  let startLine = firstHighlight.start.line - opts.padding.before;
  startLine = startLine < 0 ? 0 : startLine;
  let endLineIndex = lastHighlight.end.line + opts.padding.after;
  endLineIndex = endLineIndex - startLine > opts.maxLines ? startLine + opts.maxLines - 1 : endLineIndex;
  let lineNumberLength = (endLineIndex + 1).toString(10).length; // Split input into lines and highlight syntax

  let lines = code.split(NEWLINE);
  let syntaxHighlightedLines = (opts.syntaxHighlighting ? highlightSyntax(code, opts.language) : code).replace(TAB_REPLACE_REGEX, TAB_REPLACEMENT).split(NEWLINE); // Loop over all lines and create codeframe

  let resultLines = [];

  for (let currentLineIndex = startLine; currentLineIndex < syntaxHighlightedLines.length; currentLineIndex++) {
    if (currentLineIndex > endLineIndex) break;
    if (currentLineIndex > syntaxHighlightedLines.length - 1) break; // Find highlights that need to get rendered on the current line

    let lineHighlights = highlights.filter(highlight => highlight.start.line <= currentLineIndex && highlight.end.line >= currentLineIndex).sort((a, b) => (a.start.line < currentLineIndex ? 0 : a.start.column) - (b.start.line < currentLineIndex ? 0 : b.start.column)); // Check if this line has a full line highlight

    let isWholeLine = lineHighlights.length && !!lineHighlights.find(h => h.start.line < currentLineIndex && h.end.line > currentLineIndex);
    let lineLengthLimit = opts.terminalWidth > lineNumberLength + 7 ? opts.terminalWidth - (lineNumberLength + 5) : 10; // Split the line into line parts that will fit the provided terminal width

    let colOffset = 0;
    let lineEndCol = lineLengthLimit;
    let syntaxHighlightedLine = syntaxHighlightedLines[currentLineIndex];

    if ((0, _stringWidth().default)(syntaxHighlightedLine) > lineLengthLimit) {
      if (lineHighlights.length > 0) {
        if (lineHighlights[0].start.line === currentLineIndex) {
          colOffset = lineHighlights[0].start.column - 5;
        } else if (lineHighlights[0].end.line === currentLineIndex) {
          colOffset = lineHighlights[0].end.column - 5;
        }
      }

      colOffset = colOffset > 0 ? colOffset : 0;
      lineEndCol = colOffset + lineLengthLimit;
      syntaxHighlightedLine = (0, _sliceAnsi().default)(syntaxHighlightedLine, colOffset, lineEndCol);
    } // Write the syntax highlighted line part


    resultLines.push(lineNumberPrefixer({
      lineNumber: (currentLineIndex + 1).toString(10),
      lineNumberLength,
      isHighlighted: lineHighlights.length > 0
    }) + syntaxHighlightedLine);
    let lineWidth = (0, _stringWidth().default)(syntaxHighlightedLine);
    let highlightLine = '';

    if (isWholeLine) {
      highlightLine = highlighter('^'.repeat(lineWidth));
    } else if (lineHighlights.length > 0) {
      let lastCol = 0;
      let highlight = null;
      let highlightHasEnded = false;

      for (let highlightIndex = 0; highlightIndex < lineHighlights.length; highlightIndex++) {
        // Set highlight to current highlight
        highlight = lineHighlights[highlightIndex];
        highlightHasEnded = false; // Calculate the startColumn and get the real width by doing a substring of the original
        // line and replacing tabs with our tab replacement to support tab handling

        let startCol = 0;

        if (highlight.start.line === currentLineIndex && highlight.start.column > colOffset) {
          startCol = lines[currentLineIndex].substring(colOffset, highlight.start.column).replace(TAB_REPLACE_REGEX, TAB_REPLACEMENT).length;
        } // Calculate the endColumn and get the real width by doing a substring of the original
        // line and replacing tabs with our tab replacement to support tab handling


        let endCol = lineWidth - 1;

        if (highlight.end.line === currentLineIndex) {
          endCol = lines[currentLineIndex].substring(colOffset, highlight.end.column).replace(TAB_REPLACE_REGEX, TAB_REPLACEMENT).length; // If the endCol is too big for this line part, trim it so we can handle it in the next one

          if (endCol > lineWidth) {
            endCol = lineWidth - 1;
          }

          highlightHasEnded = true;
        } // If endcol is smaller than lastCol it overlaps with another highlight and is no longer visible, we can skip those


        if (endCol >= lastCol) {
          let characters = endCol - startCol + 1;

          if (startCol > lastCol) {
            // startCol is before lastCol, so add spaces as padding before the highlight indicators
            highlightLine += ' '.repeat(startCol - lastCol);
          } else if (lastCol > startCol) {
            // If last column is larger than the start, there's overlap in highlights
            // This line adjusts the characters count to ensure we don't add too many characters
            characters += startCol - lastCol;
          } // Append the highlight indicators


          highlightLine += highlighter('^'.repeat(characters)); // Set the lastCol equal to character count between start of line part and highlight end-column

          lastCol = endCol + 1;
        } // There's no point in processing more highlights if we reached the end of the line


        if (endCol >= lineEndCol - 1) {
          break;
        }
      } // Append the highlight message if the current highlights ends on this line part


      if (highlight && highlight.message && highlightHasEnded) {
        highlightLine += ' ' + highlighter(highlight.message, true);
      }
    }

    if (highlightLine) {
      resultLines.push(lineNumberPrefixer({
        lineNumberLength,
        isHighlighted: true
      }) + highlightLine);
    }
  }

  return resultLines.join('\n');
}