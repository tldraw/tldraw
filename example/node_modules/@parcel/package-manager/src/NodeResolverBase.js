// @flow

import type {
  PackageJSON,
  FileCreateInvalidation,
  FilePath,
  DependencySpecifier,
} from '@parcel/types';
import type {FileSystem} from '@parcel/fs';
import type {ResolveResult} from './types';

// $FlowFixMe
import Module from 'module';
import path from 'path';
import invariant from 'assert';
import {normalizeSeparators} from '@parcel/utils';

const builtins = {pnpapi: true};
for (let builtin of Module.builtinModules) {
  builtins[builtin] = true;
}

export type ModuleInfo = {|
  moduleName: string,
  subPath: ?string,
  moduleDir: FilePath,
  filePath: FilePath,
  code?: string,
|};

export type ResolverContext = {|
  invalidateOnFileCreate: Array<FileCreateInvalidation>,
  invalidateOnFileChange: Set<FilePath>,
|};

const NODE_MODULES = `${path.sep}node_modules${path.sep}`;

export class NodeResolverBase<T> {
  fs: FileSystem;
  extensions: Array<string>;
  packageCache: Map<string, PackageJSON>;
  projectRoot: FilePath;

  constructor(
    fs: FileSystem,
    projectRoot: FilePath,
    extensions?: Array<string>,
  ) {
    this.fs = fs;
    this.projectRoot = projectRoot;
    this.extensions = extensions || Object.keys(Module._extensions);
    this.packageCache = new Map();
  }

  resolve(id: DependencySpecifier, from: FilePath): T {
    throw new Error(`Could not resolve "${id}" from "${from}"`);
  }

  expandFile(file: FilePath): Array<FilePath> {
    // Expand extensions and aliases
    let res = [];
    for (let ext of this.extensions) {
      let f = file + ext;
      res.push(f);
    }

    if (path.extname(file)) {
      res.unshift(file);
    } else {
      res.push(file);
    }

    return res;
  }

  getPackageEntries(dir: FilePath, pkg: PackageJSON): Array<string> {
    let main = pkg.main;
    if (
      process.env.PARCEL_BUILD_ENV !== 'production' &&
      typeof pkg.name === 'string' &&
      pkg.name.startsWith('@parcel/') &&
      pkg.name !== '@parcel/watcher'
    ) {
      main = pkg.source;
    }

    return [main]
      .filter(entry => typeof entry === 'string')
      .map(main => {
        // Default to index file if no main field find
        if (!main || main === '.' || main === './') {
          main = 'index';
        }

        invariant(typeof main === 'string');
        return path.resolve(dir, main);
      });
  }

  getModuleParts(name: string): [FilePath, ?string] {
    name = path.normalize(name);
    let splitOn = name.indexOf(path.sep);
    if (name.charAt(0) === '@') {
      splitOn = name.indexOf(path.sep, splitOn + 1);
    }
    if (splitOn < 0) {
      return [normalizeSeparators(name), undefined];
    } else {
      return [
        normalizeSeparators(name.substring(0, splitOn)),
        name.substring(splitOn + 1) || undefined,
      ];
    }
  }

  isBuiltin(name: DependencySpecifier): boolean {
    return !!(builtins[name] || name.startsWith('node:'));
  }

  findNodeModulePath(
    id: DependencySpecifier,
    sourceFile: FilePath,
    ctx: ResolverContext,
  ): ?ResolveResult | ?ModuleInfo {
    if (this.isBuiltin(id)) {
      return {
        resolved: id,
        invalidateOnFileChange: new Set(),
        invalidateOnFileCreate: [],
      };
    }

    let [moduleName, subPath] = this.getModuleParts(id);
    let dir = path.dirname(sourceFile);
    let moduleDir = this.fs.findNodeModule(moduleName, dir);

    ctx.invalidateOnFileCreate.push({
      fileName: `node_modules/${moduleName}`,
      aboveFilePath: sourceFile,
    });

    if (!moduleDir && process.versions.pnp != null) {
      try {
        let pnp = Module.findPnpApi(dir + '/');
        moduleDir = pnp.resolveToUnqualified(
          moduleName +
            // retain slash in `require('assert/')` to force loading builtin from npm
            (id[moduleName.length] === '/' ? '/' : ''),
          dir + '/',
        );

        // Invalidate whenever the .pnp.js file changes.
        ctx.invalidateOnFileChange.add(
          pnp.resolveToUnqualified('pnpapi', null),
        );
      } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
          throw e;
        }
      }
    }

    if (moduleDir) {
      return {
        moduleName,
        subPath,
        moduleDir: moduleDir,
        filePath: subPath ? path.join(moduleDir, subPath) : moduleDir,
      };
    }

    return null;
  }

  getNodeModulesPackagePath(sourceFile: FilePath): ?FilePath {
    // If the file is in node_modules, we can find the package.json in the root of the package
    // by slicing from the start of the string until 1-2 path segments after node_modules.
    let index = sourceFile.lastIndexOf(NODE_MODULES);
    if (index >= 0) {
      index += NODE_MODULES.length;

      // If a scoped path, add an extra path segment.
      if (sourceFile[index] === '@') {
        index = sourceFile.indexOf(path.sep, index) + 1;
      }

      index = sourceFile.indexOf(path.sep, index);
      return path.join(
        sourceFile.slice(0, index >= 0 ? index : undefined),
        'package.json',
      );
    }
  }

  invalidate(filePath: FilePath) {
    // Invalidate the package.jsons above `filePath`
    let dir = path.dirname(filePath);
    let {root} = path.parse(dir);
    while (dir !== root && path.basename(dir) !== 'node_modules') {
      this.packageCache.delete(path.join(dir, 'package.json'));
      dir = path.dirname(dir);
    }
  }
}
