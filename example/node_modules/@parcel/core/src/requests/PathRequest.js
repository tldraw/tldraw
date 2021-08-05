// @flow strict-local
import type {Diagnostic} from '@parcel/diagnostic';
import type {
  Async,
  FileCreateInvalidation,
  FilePath,
  QueryParameters,
} from '@parcel/types';
import type {StaticRunOpts} from '../RequestTracker';
import type {AssetGroup, Dependency, ParcelOptions} from '../types';
import type {ConfigAndCachePath} from './ParcelConfigRequest';

import ThrowableDiagnostic, {errorToDiagnostic, md} from '@parcel/diagnostic';
import {PluginLogger} from '@parcel/logger';
import nullthrows from 'nullthrows';
import path from 'path';
import URL from 'url';
import {normalizePath} from '@parcel/utils';
import querystring from 'querystring';
import {report} from '../ReporterRunner';
import PublicDependency from '../public/Dependency';
import PluginOptions from '../public/PluginOptions';
import ParcelConfig from '../ParcelConfig';
import createParcelConfigRequest, {
  getCachedParcelConfig,
} from './ParcelConfigRequest';
import {invalidateOnFileCreateToInternal} from '../utils';
import {
  fromProjectPath,
  fromProjectPathRelative,
  toProjectPath,
} from '../projectPath';
import {Priority} from '../types';

export type PathRequest = {|
  id: string,
  +type: 'path_request',
  run: RunOpts => Async<?AssetGroup>,
  input: PathRequestInput,
|};

export type PathRequestInput = {|
  dependency: Dependency,
  name: string,
|};

type RunOpts = {|
  input: PathRequestInput,
  ...StaticRunOpts,
|};

const type = 'path_request';
const QUERY_PARAMS_REGEX = /^([^\t\r\n\v\f?]*)(\?.*)?/;
const PIPELINE_REGEX = /^([a-z0-9-]+?):(.*)$/i;

export default function createPathRequest(
  input: PathRequestInput,
): PathRequest {
  return {
    id: input.dependency.id + ':' + input.name,
    type,
    run,
    input,
  };
}

async function run({input, api, options}: RunOpts) {
  let configResult = nullthrows(
    await api.runRequest<null, ConfigAndCachePath>(createParcelConfigRequest()),
  );
  let config = getCachedParcelConfig(configResult, options);
  let resolverRunner = new ResolverRunner({
    options,
    config,
  });
  let result: ResolverResult = await resolverRunner.resolve(input.dependency);

  if (result.invalidateOnFileCreate) {
    for (let file of result.invalidateOnFileCreate) {
      api.invalidateOnFileCreate(
        invalidateOnFileCreateToInternal(options.projectRoot, file),
      );
    }
  }

  if (result.invalidateOnFileChange) {
    for (let filePath of result.invalidateOnFileChange) {
      let pp = toProjectPath(options.projectRoot, filePath);
      api.invalidateOnFileUpdate(pp);
      api.invalidateOnFileDelete(pp);
    }
  }

  if (result.assetGroup) {
    api.invalidateOnFileDelete(result.assetGroup.filePath);
    return result.assetGroup;
  }

  if (result.diagnostics && result.diagnostics.length > 0) {
    let err = new ThrowableDiagnostic({diagnostic: result.diagnostics});
    // $FlowFixMe[prop-missing]
    err.code = 'MODULE_NOT_FOUND';
    throw err;
  }
}

type ResolverRunnerOpts = {|
  config: ParcelConfig,
  options: ParcelOptions,
|};

type ResolverResult = {|
  assetGroup: ?AssetGroup,
  invalidateOnFileCreate?: Array<FileCreateInvalidation>,
  invalidateOnFileChange?: Array<FilePath>,
  diagnostics?: Array<Diagnostic>,
|};

export class ResolverRunner {
  config: ParcelConfig;
  options: ParcelOptions;
  pluginOptions: PluginOptions;

  constructor({config, options}: ResolverRunnerOpts) {
    this.config = config;
    this.options = options;
    this.pluginOptions = new PluginOptions(this.options);
  }

  async getDiagnostic(
    dependency: Dependency,
    message: string,
  ): Async<Diagnostic> {
    let diagnostic: Diagnostic = {
      message,
      origin: '@parcel/core',
    };

    if (dependency.loc && dependency.sourcePath != null) {
      let filePath = fromProjectPath(
        this.options.projectRoot,
        dependency.sourcePath,
      );
      diagnostic.codeFrames = [
        {
          filePath,
          code: await this.options.inputFS.readFile(filePath, 'utf8'),
          codeHighlights: dependency.loc
            ? [{start: dependency.loc.start, end: dependency.loc.end}]
            : [],
        },
      ];
    }

    return diagnostic;
  }

  async resolve(dependency: Dependency): Promise<ResolverResult> {
    let dep = new PublicDependency(dependency, this.options);
    report({
      type: 'buildProgress',
      phase: 'resolving',
      dependency: dep,
    });

    let resolvers = await this.config.getResolvers();

    let pipeline;
    let filePath;
    let query: ?QueryParameters;
    let validPipelines = new Set(this.config.getNamedPipelines());
    let match = dependency.specifier.match(PIPELINE_REGEX);
    if (
      match &&
      // Don't consider absolute paths. Absolute paths are only supported for entries,
      // and include e.g. `C:\` on Windows, conflicting with pipelines.
      !path.isAbsolute(dependency.specifier)
    ) {
      if (dependency.specifier.startsWith('node:')) {
        filePath = dependency.specifier;
      } else {
        [, pipeline, filePath] = match;
        if (!validPipelines.has(pipeline)) {
          if (dep.specifierType === 'url') {
            // This may be a url protocol or scheme rather than a pipeline, such as
            // `url('http://example.com/foo.png')`
            return {assetGroup: null};
          } else {
            return {
              assetGroup: null,
              diagnostics: [
                await this.getDiagnostic(
                  dependency,
                  md`Unknown pipeline: ${pipeline}.`,
                ),
              ],
            };
          }
        }
      }
    } else {
      if (dep.specifierType === 'url') {
        if (dependency.specifier.startsWith('//')) {
          // A protocol-relative URL, e.g `url('//example.com/foo.png')`
          return {assetGroup: null};
        }
        if (dependency.specifier.startsWith('#')) {
          // An ID-only URL, e.g. `url(#clip-path)` for CSS rules
          return {assetGroup: null};
        }
      }
      filePath = dependency.specifier;
    }

    let queryPart = null;
    if (dep.specifierType === 'url') {
      let parsed = URL.parse(filePath);
      if (typeof parsed.pathname !== 'string') {
        return {
          assetGroup: null,
          diagnostics: [
            await this.getDiagnostic(
              dependency,
              md`Received URL without a pathname ${filePath}.`,
            ),
          ],
        };
      }
      filePath = decodeURIComponent(parsed.pathname);
      if (parsed.query != null) {
        queryPart = parsed.query;
      }
    } else {
      let matchesQuerystring = filePath.match(QUERY_PARAMS_REGEX);
      if (matchesQuerystring && matchesQuerystring[2] != null) {
        filePath = matchesQuerystring[1];
        queryPart = matchesQuerystring[2].substr(1);
      }
    }
    if (queryPart != null) {
      query = querystring.parse(queryPart);
    }

    // Entrypoints, convert ProjectPath in module specifier to absolute path
    if (dep.resolveFrom == null) {
      filePath = path.join(this.options.projectRoot, filePath);
    }
    let diagnostics: Array<Diagnostic> = [];
    let invalidateOnFileCreate = [];
    let invalidateOnFileChange = [];
    for (let resolver of resolvers) {
      try {
        let result = await resolver.plugin.resolve({
          filePath,
          pipeline,
          dependency: dep,
          options: this.pluginOptions,
          logger: new PluginLogger({origin: resolver.name}),
        });

        if (result) {
          if (result.meta) {
            dependency.resolverMeta = result.meta;
            dependency.meta = {
              ...dependency.meta,
              ...result.meta,
            };
          }

          if (result.priority != null) {
            dependency.priority = Priority[result.priority];
          }

          if (result.invalidateOnFileCreate) {
            invalidateOnFileCreate.push(...result.invalidateOnFileCreate);
          }

          if (result.invalidateOnFileChange) {
            invalidateOnFileChange.push(...result.invalidateOnFileChange);
          }

          if (result.isExcluded) {
            return {
              assetGroup: null,
              invalidateOnFileCreate,
              invalidateOnFileChange,
            };
          }

          if (result.filePath != null) {
            let resultFilePath = result.filePath;
            if (!path.isAbsolute(resultFilePath)) {
              throw new Error(
                md`Resolvers must return an absolute path, ${resolver.name} returned: ${resultFilePath}`,
              );
            }

            return {
              assetGroup: {
                canDefer: result.canDefer,
                filePath: toProjectPath(
                  this.options.projectRoot,
                  resultFilePath,
                ),
                query,
                sideEffects: result.sideEffects,
                code: result.code,
                env: dependency.env,
                pipeline:
                  result.pipeline === undefined
                    ? pipeline ?? dependency.pipeline
                    : result.pipeline,
                isURL: dep.specifierType === 'url',
              },
              invalidateOnFileCreate,
              invalidateOnFileChange,
            };
          }

          if (result.diagnostics) {
            let errorDiagnostic = errorToDiagnostic(
              new ThrowableDiagnostic({diagnostic: result.diagnostics}),
              {
                origin: resolver.name,
                filePath,
              },
            );
            diagnostics.push(...errorDiagnostic);
          }
        }
      } catch (e) {
        // Add error to error map, we'll append these to the standard error if we can't resolve the asset
        let errorDiagnostic = errorToDiagnostic(e, {
          origin: resolver.name,
          filePath,
        });
        if (Array.isArray(errorDiagnostic)) {
          diagnostics.push(...errorDiagnostic);
        } else {
          diagnostics.push(errorDiagnostic);
        }

        break;
      }
    }

    if (dep.isOptional) {
      return {
        assetGroup: null,
        invalidateOnFileCreate,
        invalidateOnFileChange,
      };
    }

    let resolveFrom = dependency.resolveFrom ?? dependency.sourcePath;
    let dir =
      resolveFrom != null
        ? normalizePath(fromProjectPathRelative(resolveFrom))
        : '';

    let diagnostic = await this.getDiagnostic(
      dependency,
      md`Failed to resolve '${dependency.specifier}' ${
        dir ? `from '${dir}'` : ''
      }`,
    );

    diagnostics.unshift(diagnostic);

    return {
      assetGroup: null,
      invalidateOnFileCreate,
      invalidateOnFileChange,
      diagnostics,
    };
  }
}
