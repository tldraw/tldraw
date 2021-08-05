// @flow
import type {Writable} from 'stream';

import readline from 'readline';
import ora from 'ora';
import stringWidth from 'string-width';

import type {PadAlign} from './utils';
import {pad, countLines} from './utils';
import * as emoji from './emoji';

type ColumnType = {|
  align: PadAlign,
|};

export const isTTY: any | boolean | true =
  // $FlowFixMe
  process.env.NODE_ENV !== 'test' && process.stdout.isTTY;

let stdout = process.stdout;
let stderr = process.stderr;

// Some state so we clear the output properly
let lineCount = 0;
let errorLineCount = 0;
let statusPersisted = false;

export function _setStdio(stdoutLike: Writable, stderrLike: Writable) {
  stdout = stdoutLike;
  stderr = stderrLike;
}

let spinner = ora({
  color: 'green',
  stream: stdout,
  discardStdin: false,
});
let persistedMessages = [];

export function writeOut(message: string, isError: boolean = false) {
  let processedMessage = message + '\n';
  let hasSpinner = spinner.isSpinning;

  // Stop spinner so we don't duplicate it
  if (hasSpinner) {
    spinner.stop();
  }

  let lines = countLines(message);
  if (isError) {
    stderr.write(processedMessage);
    errorLineCount += lines;
  } else {
    stdout.write(processedMessage);
    lineCount += lines;
  }

  // Restart the spinner
  if (hasSpinner) {
    spinner.start();
  }
}

export function persistMessage(message: string) {
  if (persistedMessages.includes(message)) return;

  persistedMessages.push(message);
  writeOut(message);
}

export function updateSpinner(message: string) {
  // This helps the spinner play well with the tests
  if (!isTTY) {
    writeOut(message);
    return;
  }

  spinner.text = message + '\n';
  if (!spinner.isSpinning) {
    spinner.start();
  }
}

export function persistSpinner(
  name: string,
  status: 'success' | 'error',
  message: string,
) {
  spinner.stopAndPersist({
    symbol: emoji[status],
    text: message,
  });

  statusPersisted = true;
}

function clearStream(stream: Writable, lines: number) {
  if (!isTTY) return;

  readline.moveCursor(stream, 0, -lines);
  readline.clearScreenDown(stream);
}

// Reset the window's state
export function resetWindow() {
  if (!isTTY) return;

  // If status has been persisted we add a line
  // Otherwise final states would remain in the terminal for rebuilds
  if (statusPersisted) {
    lineCount++;
    statusPersisted = false;
  }

  clearStream(stderr, errorLineCount);
  errorLineCount = 0;

  clearStream(stdout, lineCount);
  lineCount = 0;

  for (let m of persistedMessages) {
    writeOut(m);
  }
}

export function table(columns: Array<ColumnType>, table: Array<Array<string>>) {
  // Measure column widths
  let colWidths = [];
  for (let row of table) {
    let i = 0;
    for (let item of row) {
      colWidths[i] = Math.max(colWidths[i] || 0, stringWidth(item));
      i++;
    }
  }

  // Render rows
  for (let row of table) {
    let items = row.map((item, i) => {
      // Add padding between columns unless the alignment is the opposite to the
      // next column and pad to the column width.
      let padding =
        !columns[i + 1] || columns[i + 1].align === columns[i].align ? 4 : 0;
      return pad(item, colWidths[i] + padding, columns[i].align);
    });

    writeOut(items.join(''));
  }
}
