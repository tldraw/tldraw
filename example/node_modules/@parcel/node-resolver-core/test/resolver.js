// @flow strict-local
import NodeResolver from '../src/NodeResolver';
import path from 'path';
import assert from 'assert';
import nullthrows from 'nullthrows';
import {ncp, overlayFS, outputFS} from '@parcel/test-utils';
import {loadConfig as configCache} from '@parcel/utils';
import {createEnvironment} from '@parcel/core/src/Environment';
import Environment from '@parcel/core/src/public/Environment';
import {DEFAULT_OPTIONS} from '@parcel/core/test/test-utils';

const rootDir = path.join(__dirname, 'fixture');

const NODE_ENV = new Environment(
  createEnvironment({
    context: 'node',
    includeNodeModules: false,
  }),
  DEFAULT_OPTIONS,
);

const NODE_INCLUDE_ENV = new Environment(
  createEnvironment({
    context: 'node',
    includeNodeModules: true,
  }),
  DEFAULT_OPTIONS,
);

const BROWSER_ENV = new Environment(
  createEnvironment({
    context: 'browser',
    includeNodeModules: true,
  }),
  DEFAULT_OPTIONS,
);

describe('resolver', function() {
  let resolver;

  beforeEach(async function() {
    await overlayFS.mkdirp(rootDir);
    await ncp(rootDir, rootDir);

    // Create the symlinks here to prevent cross platform and git issues
    await outputFS.symlink(
      path.join(rootDir, 'packages/source'),
      path.join(rootDir, 'node_modules/source'),
    );
    await outputFS.symlink(
      path.join(rootDir, 'packages/source-alias'),
      path.join(rootDir, 'node_modules/source-alias'),
    );
    await outputFS.symlink(
      path.join(rootDir, 'packages/source-alias-glob'),
      path.join(rootDir, 'node_modules/source-alias-glob'),
    );
    await outputFS.symlink(
      path.join(rootDir, 'bar.js'),
      path.join(rootDir, 'baz.js'),
    );
    await outputFS.symlink(
      path.join(rootDir, 'nested'),
      path.join(rootDir, 'symlinked-nested'),
    );

    resolver = new NodeResolver({
      fs: overlayFS,
      projectRoot: rootDir,
      mainFields: ['browser', 'source', 'module', 'main'],
      extensions: ['.js', '.json'],
    });

    configCache.clear();
  });

  describe('file paths', function() {
    it('should resolve a relative path with an extension', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: './bar.js',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.equal(nullthrows(resolved).filePath, path.join(rootDir, 'bar.js'));
    });

    it('should resolve a relative path without an extension', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: './bar',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.equal(nullthrows(resolved).filePath, path.join(rootDir, 'bar.js'));
    });

    it('should resolve an absolute path from the root module', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: '/bar',
        isURL: false,
        parent: path.join(rootDir, 'nested', 'test.js'),
      });
      assert.equal(nullthrows(resolved).filePath, path.join(rootDir, 'bar.js'));
    });

    it('should resolve an absolute path from a node_modules folder', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: '/bar',
        isURL: false,
        parent: path.join(rootDir, 'node_modules', 'foo', 'index.js'),
      });
      assert.equal(nullthrows(resolved).filePath, path.join(rootDir, 'bar.js'));
    });

    it('should resolve a tilde path from the root module', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: '~/bar',
        isURL: false,
        parent: path.join(rootDir, 'nested', 'test.js'),
      });
      assert.equal(nullthrows(resolved).filePath, path.join(rootDir, 'bar.js'));
    });

    it('should resolve a tilde path from the root module without a slash', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: '~bar',
        isURL: false,
        parent: path.join(rootDir, 'nested', 'test.js'),
      });
      assert.equal(nullthrows(resolved).filePath, path.join(rootDir, 'bar.js'));
    });

    it('should resolve a tilde path from a node_modules folder', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: '~/bar',
        isURL: false,
        parent: path.join(rootDir, 'node_modules', 'foo', 'nested', 'baz.js'),
      });
      assert.equal(
        nullthrows(resolved).filePath,
        path.join(rootDir, 'node_modules', 'foo', 'bar.js'),
      );
    });
  });

  describe('builtins', function() {
    it('should resolve node builtin modules', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'zlib',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: require.resolve('browserify-zlib'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: require.resolve('browserify-zlib'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          require.resolve('browserify-zlib/package.json'),
        ],
      });
    });

    it('Should be able to handle node: prefixes', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'node:zlib',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: require.resolve('browserify-zlib'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: require.resolve('browserify-zlib'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          require.resolve('browserify-zlib/package.json'),
        ],
      });
    });

    it('should resolve unimplemented node builtin modules to an empty file', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'fs',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(__dirname, '..', 'src', '_empty.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(__dirname, '..', 'src', '_empty.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(__dirname, '..', 'package.json'),
        ],
      });
    });

    it('should error when resolving node builtin modules with --target=node', async function() {
      let resolved = await resolver.resolve({
        env: NODE_ENV,
        filename: 'zlib',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {isExcluded: true});
    });

    it('should exclude the electron module in electron environments', async function() {
      let resolved = await resolver.resolve({
        env: new Environment(
          createEnvironment({
            context: 'electron-main',
            isLibrary: true,
          }),
          DEFAULT_OPTIONS,
        ),
        filename: 'electron',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
        sourcePath: path.join(rootDir, 'foo.js'),
      });

      assert.deepEqual(resolved, {isExcluded: true});
    });
  });

  describe('node_modules', function() {
    it('should resolve a node_modules index.js', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'foo',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'node_modules', 'foo', 'index.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/foo',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(rootDir, 'node_modules', 'foo', 'package.json'),
        ],
      });
    });

    it('should resolve a node_modules package.main', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'package-main',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'node_modules', 'package-main', 'main.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/package-main',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(rootDir, 'node_modules', 'package-main', 'package.json'),
        ],
      });
    });

    it('should resolve a node_modules package.module', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'package-module',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(
          rootDir,
          'node_modules',
          'package-module',
          'module.js',
        ),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/package-module',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(rootDir, 'node_modules', 'package-module', 'package.json'),
        ],
      });
    });

    it('should resolve a node_modules package.browser main field', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'package-browser',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(
          rootDir,
          'node_modules',
          'package-browser',
          'browser.js',
        ),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/package-browser',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(rootDir, 'node_modules', 'package-browser', 'package.json'),
        ],
      });
    });

    it('should not resolve a node_modules package.browser main field with --target=node', async function() {
      let resolved = await resolver.resolve({
        env: NODE_INCLUDE_ENV,
        filename: 'package-browser',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(
          rootDir,
          'node_modules',
          'package-browser',
          'main.js',
        ),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/package-browser',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(rootDir, 'node_modules', 'package-browser', 'package.json'),
        ],
      });
    });

    it('should fall back to index.js when it cannot find package.main', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'package-fallback',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(
          rootDir,
          'node_modules',
          'package-fallback',
          'index.js',
        ),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/package-fallback',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            filePath: path.join(
              rootDir,
              'node_modules',
              'package-fallback',
              'main.js',
            ),
          },
          {
            filePath: path.join(
              rootDir,
              'node_modules',
              'package-fallback',
              'main.js.js',
            ),
          },
          {
            filePath: path.join(
              rootDir,
              'node_modules',
              'package-fallback',
              'main.js.json',
            ),
          },
          {
            filePath: path.join(
              rootDir,
              'node_modules',
              'package-fallback',
              'main.js/package.json',
            ),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(
            rootDir,
            'node_modules',
            'package-fallback',
            'package.json',
          ),
        ],
      });
    });

    it('should resolve a node_module package.main pointing to a directory', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'package-main-directory',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(
          rootDir,
          'node_modules',
          'package-main-directory',
          'nested',
          'index.js',
        ),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/package-main-directory',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            filePath: path.join(
              rootDir,
              'node_modules',
              'package-main-directory',
              'nested.js',
            ),
          },
          {
            filePath: path.join(
              rootDir,
              'node_modules',
              'package-main-directory',
              'nested.json',
            ),
          },
          {
            filePath: path.join(
              rootDir,
              'node_modules',
              'package-main-directory',
              'nested',
              'package.json',
            ),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(
            rootDir,
            'node_modules',
            'package-main-directory',
            'package.json',
          ),
        ],
      });
    });

    it('should resolve a file inside a node_modules folder', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'foo/nested/baz',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'node_modules', 'foo', 'nested', 'baz.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/foo',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(rootDir, 'node_modules', 'foo', 'package.json'),
        ],
      });
    });

    it('should resolve a scoped module', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: '@scope/pkg',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.resolve(rootDir, 'node_modules/@scope/pkg/index.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/@scope/pkg',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(rootDir, 'node_modules', '@scope', 'pkg', 'package.json'),
        ],
      });
    });

    it('should resolve a file inside a scoped module', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: '@scope/pkg/foo/bar',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.resolve(rootDir, 'node_modules/@scope/pkg/foo/bar.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/@scope/pkg',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(rootDir, 'node_modules', '@scope', 'pkg', 'package.json'),
        ],
      });
    });

    describe('sideEffects: false', function() {
      it('should determine sideEffects correctly (file)', async function() {
        let resolved = await resolver.resolve({
          env: BROWSER_ENV,
          filename: 'side-effects-false/src/index.js',
          isURL: false,
          parent: path.join(rootDir, 'foo.js'),
        });
        assert.deepEqual(resolved, {
          filePath: path.resolve(
            rootDir,
            'node_modules/side-effects-false/src/index.js',
          ),
          sideEffects: false,
          invalidateOnFileCreate: [
            {
              fileName: 'package.json',
              aboveFilePath: path.join(rootDir, 'index'),
            },
            {
              fileName: 'package.json',
              aboveFilePath: path.join(rootDir, 'foo.js'),
            },
            {
              fileName: 'node_modules/side-effects-false',
              aboveFilePath: path.join(rootDir, 'foo.js'),
            },
          ],
          invalidateOnFileChange: [
            path.join(rootDir, 'package.json'),
            path.join(
              rootDir,
              'node_modules',
              'side-effects-false',
              'package.json',
            ),
          ],
        });
      });

      it('should determine sideEffects correctly (extensionless file)', async function() {
        let resolved = await resolver.resolve({
          env: BROWSER_ENV,
          filename: 'side-effects-false/src/index',
          isURL: false,
          parent: path.join(rootDir, 'foo.js'),
        });
        assert.deepEqual(resolved, {
          filePath: path.resolve(
            rootDir,
            'node_modules/side-effects-false/src/index.js',
          ),
          sideEffects: false,
          invalidateOnFileCreate: [
            {
              fileName: 'package.json',
              aboveFilePath: path.join(rootDir, 'index'),
            },
            {
              fileName: 'package.json',
              aboveFilePath: path.join(rootDir, 'foo.js'),
            },
            {
              fileName: 'node_modules/side-effects-false',
              aboveFilePath: path.join(rootDir, 'foo.js'),
            },
          ],
          invalidateOnFileChange: [
            path.join(rootDir, 'package.json'),
            path.join(
              rootDir,
              'node_modules',
              'side-effects-false',
              'package.json',
            ),
          ],
        });
      });

      it('should determine sideEffects correctly (sub folder)', async function() {
        let resolved = await resolver.resolve({
          env: BROWSER_ENV,
          filename: 'side-effects-false/src/',
          isURL: false,
          parent: path.join(rootDir, 'foo.js'),
        });
        assert.deepEqual(resolved, {
          filePath: path.resolve(
            rootDir,
            'node_modules/side-effects-false/src/index.js',
          ),
          sideEffects: false,
          invalidateOnFileCreate: [
            {
              fileName: 'package.json',
              aboveFilePath: path.join(rootDir, 'index'),
            },
            {
              fileName: 'package.json',
              aboveFilePath: path.join(rootDir, 'foo.js'),
            },
            {
              fileName: 'node_modules/side-effects-false',
              aboveFilePath: path.join(rootDir, 'foo.js'),
            },
            {
              filePath: path.join(
                rootDir,
                'node_modules',
                'side-effects-false',
                'src',
                'package.json',
              ),
            },
            {
              aboveFilePath: path.join(
                rootDir,
                'node_modules',
                'side-effects-false',
                'src',
                'index',
              ),
              fileName: 'package.json',
            },
          ],
          invalidateOnFileChange: [
            path.join(rootDir, 'package.json'),
            path.join(
              rootDir,
              'node_modules',
              'side-effects-false',
              'package.json',
            ),
          ],
        });
      });

      it('should determine sideEffects correctly (main field)', async function() {
        let resolved = await resolver.resolve({
          env: BROWSER_ENV,
          filename: 'side-effects-false/src/',
          isURL: false,
          parent: path.join(rootDir, 'foo.js'),
        });
        assert.deepEqual(resolved, {
          filePath: path.resolve(
            rootDir,
            'node_modules/side-effects-false/src/index.js',
          ),
          sideEffects: false,
          invalidateOnFileCreate: [
            {
              fileName: 'package.json',
              aboveFilePath: path.join(rootDir, 'index'),
            },
            {
              fileName: 'package.json',
              aboveFilePath: path.join(rootDir, 'foo.js'),
            },
            {
              fileName: 'node_modules/side-effects-false',
              aboveFilePath: path.join(rootDir, 'foo.js'),
            },
            {
              filePath: path.join(
                rootDir,
                'node_modules',
                'side-effects-false',
                'src',
                'package.json',
              ),
            },
            {
              aboveFilePath: path.join(
                rootDir,
                'node_modules',
                'side-effects-false',
                'src',
                'index',
              ),
              fileName: 'package.json',
            },
          ],
          invalidateOnFileChange: [
            path.join(rootDir, 'package.json'),
            path.join(
              rootDir,
              'node_modules',
              'side-effects-false',
              'package.json',
            ),
          ],
        });
      });
    });
  });

  describe('aliases', function() {
    it('should alias the main file using the package.browser field', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'package-browser-alias',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(
          rootDir,
          'node_modules',
          'package-browser-alias',
          'browser.js',
        ),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/package-browser-alias',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(
            rootDir,
            'node_modules',
            'package-browser-alias',
            'package.json',
          ),
        ],
      });
    });

    it('should alias a sub-file using the package.browser field', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'package-browser-alias/foo',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(
          rootDir,
          'node_modules',
          'package-browser-alias',
          'bar.js',
        ),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/package-browser-alias',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(
            rootDir,
            'node_modules',
            'package-browser-alias',
            'package.json',
          ),
        ],
      });
    });

    it('should alias a relative file using the package.browser field', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: './foo',
        isURL: false,
        parent: path.join(
          rootDir,
          'node_modules',
          'package-browser-alias',
          'browser.js',
        ),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(
          rootDir,
          'node_modules',
          'package-browser-alias',
          'bar.js',
        ),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(
              rootDir,
              'node_modules',
              'package-browser-alias',
              'browser.js',
            ),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(
              rootDir,
              'node_modules',
              'package-browser-alias',
              'bar',
            ),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(
            rootDir,
            'node_modules',
            'package-browser-alias',
            'package.json',
          ),
        ],
      });
    });

    it('should not alias using the package.browser field with --target=node', async function() {
      let resolved = await resolver.resolve({
        env: NODE_INCLUDE_ENV,
        filename: 'package-browser-alias/foo',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(
          rootDir,
          'node_modules',
          'package-browser-alias',
          'foo.js',
        ),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/package-browser-alias',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(
            rootDir,
            'node_modules',
            'package-browser-alias',
            'package.json',
          ),
        ],
      });
    });

    it('should alias a deep nested relative file using the package.browser field', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: './nested',
        isURL: false,
        parent: path.join(
          rootDir,
          'node_modules',
          'package-browser-alias',
          'browser.js',
        ),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(
          rootDir,
          'node_modules',
          'package-browser-alias',
          'subfolder1/subfolder2/subfile.js',
        ),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(
              rootDir,
              'node_modules',
              'package-browser-alias',
              'browser.js',
            ),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(
              rootDir,
              'node_modules',
              'package-browser-alias',
              'nested',
            ),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(
            rootDir,
            'node_modules',
            'package-browser-alias',
            'package.json',
          ),
        ],
      });
    });

    it('should alias a sub-file using the package.alias field', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'package-alias/foo',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'node_modules', 'package-alias', 'bar.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/package-alias',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(rootDir, 'node_modules', 'package-alias', 'package.json'),
        ],
      });
    });

    it('should alias a relative file using the package.alias field', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: './foo',
        isURL: false,
        parent: path.join(
          rootDir,
          'node_modules',
          'package-alias',
          'browser.js',
        ),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'node_modules', 'package-alias', 'bar.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(
              rootDir,
              'node_modules',
              'package-alias',
              'browser.js',
            ),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(
              rootDir,
              'node_modules',
              'package-alias',
              'bar',
            ),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(rootDir, 'node_modules', 'package-alias', 'package.json'),
        ],
      });
    });

    it('should alias a glob using the package.alias field', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: './lib/test',
        isURL: false,
        parent: path.join(
          rootDir,
          'node_modules',
          'package-alias-glob',
          'index.js',
        ),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(
          rootDir,
          'node_modules',
          'package-alias-glob',
          'src',
          'test.js',
        ),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(
              rootDir,
              'node_modules',
              'package-alias-glob',
              'index.js',
            ),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(
              rootDir,
              'node_modules',
              'package-alias-glob',
              'src',
              'test',
            ),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(
            rootDir,
            'node_modules',
            'package-alias-glob',
            'package.json',
          ),
        ],
      });
    });

    it('should apply a module alias using the package.alias field in the root package', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'aliased',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'node_modules', 'foo', 'index.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/foo',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(rootDir, 'node_modules', 'foo', 'package.json'),
        ],
      });
    });

    it('should apply a global module alias using the package.alias field in the root package', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'aliased',
        isURL: false,
        parent: path.join(rootDir, 'node_modules', 'package-alias', 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'node_modules', 'foo', 'index.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(
              rootDir,
              'node_modules',
              'package-alias',
              'foo.js',
            ),
          },
          {
            fileName: 'node_modules/foo',
            aboveFilePath: path.join(
              rootDir,
              'node_modules',
              'package-alias',
              'foo.js',
            ),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(rootDir, 'node_modules', 'package-alias', 'package.json'),
          path.join(rootDir, 'node_modules', 'foo', 'package.json'),
        ],
      });
    });

    it('should apply a global module alias to a sub-file in a package', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'aliased/bar',
        isURL: false,
        parent: path.join(rootDir, 'node_modules', 'package-alias', 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'node_modules', 'foo', 'bar.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(
              rootDir,
              'node_modules',
              'package-alias',
              'foo.js',
            ),
          },
          {
            fileName: 'node_modules/foo',
            aboveFilePath: path.join(
              rootDir,
              'node_modules',
              'package-alias',
              'foo.js',
            ),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(rootDir, 'node_modules', 'package-alias', 'package.json'),
          path.join(rootDir, 'node_modules', 'foo', 'package.json'),
        ],
      });
    });

    it('should apply a module alias pointing to a file using the package.alias field', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'aliased-file',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'bar.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'bar.js'),
          },
        ],
        invalidateOnFileChange: [path.join(rootDir, 'package.json')],
      });
    });

    it('should apply a global module alias pointing to a file using the package.alias field', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'aliased-file',
        isURL: false,
        parent: path.join(rootDir, 'node_modules', 'package-alias', 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'bar.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(
              rootDir,
              'node_modules',
              'package-alias',
              'foo.js',
            ),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'bar.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(rootDir, 'node_modules', 'package-alias', 'package.json'),
        ],
      });
    });

    it('should apply an alias for a virtual module folder (relative to project dir)', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'aliasedfolder/test.js',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'nested', 'test.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'nested', 'test.js'),
          },
        ],
        invalidateOnFileChange: [path.join(rootDir, 'package.json')],
      });
    });

    it('should apply an alias for a virtual module folder only (relative to project dir)', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'aliasedfolder',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'nested', 'index.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'nested'),
          },
          {
            filePath: path.join(rootDir, 'nested.js'),
          },
          {
            filePath: path.join(rootDir, 'nested.json'),
          },
          {
            filePath: path.join(rootDir, 'nested', 'package.json'),
          },
        ],
        invalidateOnFileChange: [path.join(rootDir, 'package.json')],
      });
    });

    it('should apply an alias for a virtual module folder (relative to root dir)', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'aliasedabsolute/test.js',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'nested', 'test.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'nested', 'test.js'),
          },
        ],
        invalidateOnFileChange: [path.join(rootDir, 'package.json')],
      });
    });

    it('should apply an alias for a virtual module folder only (relative to root dir)', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'aliasedabsolute',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'nested', 'index.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'nested'),
          },
          {
            filePath: path.join(rootDir, 'nested.js'),
          },
          {
            filePath: path.join(rootDir, 'nested.json'),
          },
          {
            filePath: path.join(rootDir, 'nested', 'package.json'),
          },
        ],
        invalidateOnFileChange: [path.join(rootDir, 'package.json')],
      });
    });

    it('should apply an alias for a virtual module folder sub-path', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'foo/bar',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'bar.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'bar.js'),
          },
        ],
        invalidateOnFileChange: [path.join(rootDir, 'package.json')],
      });
    });

    it('should apply an alias for a virtual module folder glob sub-path', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'glob/bar/test',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'nested', 'test.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'nested', 'test'),
          },
        ],
        invalidateOnFileChange: [path.join(rootDir, 'package.json')],
      });
    });

    it('should apply an alias for a virtual module', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'something',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'nested', 'test.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'nested', 'test.js'),
          },
        ],
        invalidateOnFileChange: [path.join(rootDir, 'package.json')],
      });
    });

    it('should apply a global alias for a virtual module', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'something',
        isURL: false,
        parent: path.join(rootDir, 'node_modules', 'package-alias', 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'nested', 'test.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(
              rootDir,
              'node_modules',
              'package-alias',
              'foo.js',
            ),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'nested', 'test.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(rootDir, 'node_modules', 'package-alias', 'package.json'),
        ],
      });
    });

    it('should resolve to an empty file when package.browser resolves to false', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'package-browser-exclude',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(__dirname, '..', 'src', '_empty.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/package-browser-exclude',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(
            rootDir,
            'node_modules',
            'package-browser-exclude',
            'package.json',
          ),
        ],
      });
    });

    it('should resolve to an empty file when package.alias resolves to false', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'package-alias-exclude',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(__dirname, '..', 'src', '_empty.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/package-alias-exclude',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(
            rootDir,
            'node_modules',
            'package-alias-exclude',
            'package.json',
          ),
        ],
      });
    });
  });

  describe('source field', function() {
    it('should use the source field when symlinked', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'source',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'packages', 'source', 'source.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/source',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(rootDir, 'node_modules', 'source', 'package.json'),
        ],
      });
    });

    it('should not use the source field when not symlinked', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'source-not-symlinked',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(
          rootDir,
          'node_modules',
          'source-not-symlinked',
          'dist.js',
        ),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/source-not-symlinked',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(
            rootDir,
            'node_modules',
            'source-not-symlinked',
            'package.json',
          ),
        ],
      });
    });

    it('should use the source field as an alias when symlinked', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'source-alias/dist',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(rootDir, 'packages', 'source-alias', 'source.js'),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/source-alias',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(rootDir, 'node_modules', 'source-alias', 'package.json'),
        ],
      });
    });

    it('should use the source field as a glob alias when symlinked', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'source-alias-glob',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.deepEqual(resolved, {
        filePath: path.join(
          rootDir,
          'packages',
          'source-alias-glob',
          'src',
          'test.js',
        ),
        sideEffects: undefined,
        invalidateOnFileCreate: [
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'index'),
          },
          {
            fileName: 'package.json',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
          {
            fileName: 'node_modules/source-alias-glob',
            aboveFilePath: path.join(rootDir, 'foo.js'),
          },
        ],
        invalidateOnFileChange: [
          path.join(rootDir, 'package.json'),
          path.join(
            rootDir,
            'node_modules',
            'source-alias-glob',
            'package.json',
          ),
        ],
      });
    });
  });

  describe('symlinks', function() {
    it('should resolve symlinked files to their realpath', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: './baz.js',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.equal(nullthrows(resolved).filePath, path.join(rootDir, 'bar.js'));
    });

    it('should resolve symlinked directories to their realpath', async function() {
      let resolved = await resolver.resolve({
        env: BROWSER_ENV,
        filename: './symlinked-nested',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });
      assert.equal(
        nullthrows(resolved).filePath,
        path.join(rootDir, 'nested', 'index.js'),
      );
    });
  });

  describe('error handling', function() {
    it('should return diagnostics when package.module does not exist', async function() {
      let result = await resolver.resolve({
        env: BROWSER_ENV,
        filename: 'package-module-fallback',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });

      assert.equal(
        nullthrows(nullthrows(result).diagnostics)[0].message,
        `Could not load './module.js' from module 'package-module-fallback' found in package.json#module`,
      );
    });

    it('should throw when a relative path cannot be resolved', async function() {
      let result = await resolver.resolve({
        env: BROWSER_ENV,
        filename: './xyz.js',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
      });

      assert.equal(
        nullthrows(nullthrows(result).diagnostics)[0].message,
        `Cannot load file './xyz.js' in './'.`,
      );
    });

    it('should throw when a node_module cannot be resolved', async function() {
      assert.strictEqual(
        null,
        await resolver.resolve({
          env: BROWSER_ENV,
          filename: 'xyz',
          isURL: false,
          parent: path.join(rootDir, 'foo.js'),
        }),
      );
    });

    it('should throw when a subfile of a node_module cannot be resolved', async function() {
      assert.strictEqual(
        null,
        await resolver.resolve({
          env: BROWSER_ENV,
          filename: 'xyz/test/file',
          isURL: false,
          parent: path.join(rootDir, 'foo.js'),
        }),
      );
    });

    it('should error when a library is missing an external dependency', async function() {
      let result = await resolver.resolve({
        env: new Environment(
          createEnvironment({
            context: 'browser',
            isLibrary: true,
            includeNodeModules: false,
          }),
          DEFAULT_OPTIONS,
        ),
        filename: 'test',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
        sourcePath: path.join(rootDir, 'foo.js'),
      });

      assert.equal(
        result?.diagnostics?.[0].message,
        'External dependency "test" is not declared in package.json.',
      );
    });

    it('should not error when external dependencies are declared', async function() {
      let result = await resolver.resolve({
        env: new Environment(
          createEnvironment({
            context: 'browser',
            isLibrary: true,
            includeNodeModules: false,
          }),
          DEFAULT_OPTIONS,
        ),
        filename: 'foo',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
        sourcePath: path.join(rootDir, 'foo.js'),
      });

      assert.deepEqual(result, {isExcluded: true});
    });

    it('should not error when external dependencies are declared in peerDependencies', async function() {
      let result = await resolver.resolve({
        env: new Environment(
          createEnvironment({
            context: 'browser',
            isLibrary: true,
            includeNodeModules: false,
          }),
          DEFAULT_OPTIONS,
        ),
        filename: 'bar',
        isURL: false,
        parent: path.join(rootDir, 'foo.js'),
        sourcePath: path.join(rootDir, 'foo.js'),
      });

      assert.deepEqual(result, {isExcluded: true});
    });

    it('should not error on missing dependencies for environment builtins', async function() {
      let result = await resolver.resolve({
        env: new Environment(
          createEnvironment({
            context: 'browser',
            isLibrary: true,
            includeNodeModules: false,
          }),
          DEFAULT_OPTIONS,
        ),
        filename: 'atom',
        isURL: false,
        parent: path.join(rootDir, 'env-dep/foo.js'),
        sourcePath: path.join(rootDir, 'env-dep/foo.js'),
      });

      assert.deepEqual(result, {isExcluded: true});
    });
  });
});
