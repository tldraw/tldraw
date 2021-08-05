// @flow strict-local

import assert from 'assert';
import {PassThrough} from 'stream';
import {_report} from '../src/CLIReporter';
import {_setStdio} from '../src/render';
import {inputFS, outputFS} from '@parcel/test-utils';
import {NodePackageManager} from '@parcel/package-manager';
import stripAnsi from 'strip-ansi';

const EMPTY_OPTIONS = {
  cacheDir: '.parcel-cache',
  entries: [],
  logLevel: 'info',
  targets: [],
  projectRoot: '',
  distDir: 'dist',
  lockFile: undefined,
  shouldAutoInstall: false,
  shouldBuildLazily: false,
  hmrOptions: undefined,
  serveOptions: false,
  mode: 'development',
  shouldScopeHoist: false,
  shouldOptimize: false,
  env: {},
  shouldDisableCache: false,
  sourceMaps: false,
  inputFS,
  outputFS,
  instanceId: 'test',
  packageManager: new NodePackageManager(inputFS, '/'),
  detailedReport: {
    assetsPerBundle: 10,
  },
};

describe('CLIReporter', () => {
  let originalStdout;
  let originalStderr;
  let stdoutOutput;
  let stderrOutput;

  beforeEach(async () => {
    // Stub these out to avoid writing noise to real stdio and to read from these
    // otherwise only writable streams
    originalStdout = process.stdout;
    originalStderr = process.stderr;

    stdoutOutput = '';
    stderrOutput = '';

    let mockStdout = new PassThrough();
    mockStdout.on('data', d => (stdoutOutput += stripAnsi(d.toString())));
    let mockStderr = new PassThrough();
    mockStderr.on('data', d => (stderrOutput += stripAnsi(d.toString())));
    _setStdio(mockStdout, mockStderr);

    await _report(
      {
        type: 'buildStart',
      },
      EMPTY_OPTIONS,
    );
  });

  afterEach(() => {
    _setStdio(originalStdout, originalStderr);
  });

  it('writes log, info, success, and verbose log messages to stdout', async () => {
    let options = {
      ...EMPTY_OPTIONS,
      logLevel: 'verbose',
    };

    await _report(
      {
        type: 'log',
        level: 'info',
        diagnostics: [
          {
            origin: 'test',
            message: 'info',
          },
        ],
      },
      options,
    );
    await _report({type: 'log', level: 'success', message: 'success'}, options);
    await _report(
      {
        type: 'log',
        level: 'verbose',
        diagnostics: [
          {
            origin: 'test',
            message: 'verbose',
          },
        ],
      },
      options,
    );

    assert.equal(stdoutOutput, 'test: info\nsuccess\ntest: verbose\n');
  });

  it('writes errors and warnings to stderr', async () => {
    await _report(
      {
        type: 'log',
        level: 'error',
        diagnostics: [
          {
            origin: 'test',
            message: 'error',
          },
        ],
      },
      EMPTY_OPTIONS,
    );
    await _report(
      {
        type: 'log',
        level: 'warn',
        diagnostics: [
          {
            origin: 'test',
            message: 'warn',
          },
        ],
      },
      EMPTY_OPTIONS,
    );

    assert.equal(stdoutOutput, '\n\n');
    assert.equal(stderrOutput, 'test: error\ntest: warn\n');
  });

  it('prints errors nicely', async () => {
    await _report(
      {
        type: 'log',
        level: 'error',
        diagnostics: [
          {
            origin: 'test',
            message: 'error',
          },
        ],
      },
      EMPTY_OPTIONS,
    );
    await _report(
      {
        type: 'log',
        level: 'warn',
        diagnostics: [
          {
            origin: 'test',
            message: 'warn',
          },
        ],
      },
      EMPTY_OPTIONS,
    );

    assert.equal(stdoutOutput, '\n\n');
    assert(stderrOutput.includes('test: error\n'));
    assert(stderrOutput.includes('test: warn\n'));
  });

  it('writes buildProgress messages to stdout on the default loglevel', async () => {
    await _report({type: 'buildProgress', phase: 'bundling'}, EMPTY_OPTIONS);
    assert.equal(stdoutOutput, 'Bundling...\n');
  });

  it('writes buildSuccess messages to stdout on the default loglevel', async () => {
    await _report({type: 'buildProgress', phase: 'bundling'}, EMPTY_OPTIONS);
    assert.equal(stdoutOutput, 'Bundling...\n');
  });
});
