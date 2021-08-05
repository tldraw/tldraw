// @flow strict-local
import type {Diagnostic} from '@parcel/diagnostic';
import type {PluginOptions} from '@parcel/types';

import formatCodeFrame from '@parcel/codeframe';
import mdAnsi from '@parcel/markdown-ansi';
import chalk from 'chalk';
import path from 'path';
import nullthrows from 'nullthrows';

export type AnsiDiagnosticResult = {|
  message: string,
  stack: string,
  codeframe: string,
  hints: Array<string>,
|};

export default async function prettyDiagnostic(
  diagnostic: Diagnostic,
  options?: PluginOptions,
  terminalWidth?: number,
): Promise<AnsiDiagnosticResult> {
  let {origin, message, stack, codeFrames, hints, skipFormatting} = diagnostic;

  let result = {
    message:
      mdAnsi(`**${origin ?? 'unknown'}**: `) +
      (skipFormatting ? message : mdAnsi(message)),
    stack: '',
    codeframe: '',
    hints: [],
  };

  if (codeFrames != null) {
    for (let codeFrame of codeFrames) {
      let filePath = codeFrame.filePath;
      if (filePath != null && options && !path.isAbsolute(filePath)) {
        filePath = path.join(options.projectRoot, filePath);
      }

      let highlights = codeFrame.codeHighlights;
      let code =
        codeFrame.code ??
        (options &&
          (await options.inputFS.readFile(nullthrows(filePath), 'utf8')));

      let formattedCodeFrame = '';
      if (code != null) {
        formattedCodeFrame = formatCodeFrame(code, highlights, {
          useColor: true,
          syntaxHighlighting: true,
          language:
            // $FlowFixMe sketchy null checks do not matter here...
            codeFrame.language ||
            (filePath != null ? path.extname(filePath).substr(1) : undefined),
          terminalWidth,
        });
      }

      result.codeframe +=
        typeof filePath !== 'string'
          ? ''
          : chalk.gray.underline(
              `${filePath}:${highlights[0].start.line}:${highlights[0].start.column}\n`,
            );
      result.codeframe += formattedCodeFrame;
      if (codeFrame !== codeFrames[codeFrames.length - 1]) {
        result.codeframe += '\n\n';
      }
    }
  }

  if (stack != null) {
    result.stack = stack;
  }

  if (Array.isArray(hints) && hints.length) {
    result.hints = hints.map(h => {
      return mdAnsi(h);
    });
  }

  return result;
}
