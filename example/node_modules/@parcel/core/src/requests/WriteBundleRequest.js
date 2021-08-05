// @flow strict-local

import type {Async, FilePath} from '@parcel/types';
import type {StaticRunOpts} from '../RequestTracker';
import type {Bundle, ContentKey, PackagedBundleInfo} from '../types';
import type {FileSystem, FileOptions} from '@parcel/fs';
import type BundleGraph from '../BundleGraph';
import type {BundleInfo} from '../PackagerRunner';

import {HASH_REF_PREFIX, HASH_REF_REGEX} from '../constants';
import nullthrows from 'nullthrows';
import path from 'path';
import {NamedBundle} from '../public/Bundle';
import {TapStream} from '@parcel/utils';
import {Readable, Transform} from 'stream';
import {fromProjectPath, toProjectPath, joinProjectPath} from '../projectPath';

const BOUNDARY_LENGTH = HASH_REF_PREFIX.length + 32 - 1;

type WriteBundleRequestInput = {|
  bundleGraph: BundleGraph,
  bundle: Bundle,
  info: BundleInfo,
  hashRefToNameHash: Map<string, string>,
|};

type RunInput = {|
  input: WriteBundleRequestInput,
  ...StaticRunOpts,
|};

export type WriteBundleRequest = {|
  id: ContentKey,
  +type: 'write_bundle_request',
  run: RunInput => Async<PackagedBundleInfo>,
  input: WriteBundleRequestInput,
|};

/**
 * Writes a bundle to the dist directory, replacing hash references with the final content hashes.
 */
export default function createWriteBundleRequest(
  input: WriteBundleRequestInput,
): WriteBundleRequest {
  let nameHash = nullthrows(
    input.hashRefToNameHash.get(input.bundle.hashReference),
  );
  return {
    id: `${input.bundle.id}:${input.info.hash}:${nameHash}`,
    type: 'write_bundle_request',
    run,
    input,
  };
}

async function run({input, options, api}: RunInput) {
  let {bundleGraph, bundle, info, hashRefToNameHash} = input;
  let {inputFS, outputFS} = options;
  let name = nullthrows(bundle.name);
  let thisHashReference = bundle.hashReference;

  if (info.type !== bundle.type) {
    name = name.slice(0, -path.extname(name).length) + '.' + info.type;
  }

  if (name.includes(thisHashReference)) {
    let thisNameHash = nullthrows(hashRefToNameHash.get(thisHashReference));
    name = name.replace(thisHashReference, thisNameHash);
  }

  let filePath = joinProjectPath(bundle.target.distDir, name);

  // Watch the bundle and source map for deletion.
  // Also watch the dist dir because invalidateOnFileDelete does not currently
  // invalidate when a parent directory is deleted.
  // TODO: do we want to also watch for file edits?
  api.invalidateOnFileDelete(bundle.target.distDir);
  api.invalidateOnFileDelete(filePath);

  let cacheKeys = info.cacheKeys;
  let mapKey = cacheKeys.map;
  let fullPath = fromProjectPath(options.projectRoot, filePath);
  if (mapKey && bundle.env.sourceMap && !bundle.env.sourceMap.inline) {
    api.invalidateOnFileDelete(
      toProjectPath(options.projectRoot, fullPath + '.map'),
    );
  }

  let dir = path.dirname(fullPath);
  await outputFS.mkdirp(dir); // ? Got rid of dist exists, is this an expensive operation

  // Use the file mode from the entry asset as the file mode for the bundle.
  // Don't do this for browser builds, as the executable bit in particular is unnecessary.
  let publicBundle = NamedBundle.get(bundle, bundleGraph, options);
  let mainEntry = publicBundle.getMainEntry();
  let writeOptions =
    publicBundle.env.isBrowser() || !mainEntry
      ? undefined
      : {
          mode: (await inputFS.stat(mainEntry.filePath)).mode,
        };
  let contentStream = options.cache.getStream(cacheKeys.content);
  let size = await writeFileStream(
    outputFS,
    fullPath,
    contentStream,
    info.hashReferences,
    hashRefToNameHash,
    writeOptions,
  );

  if (
    mapKey &&
    bundle.env.sourceMap &&
    !bundle.env.sourceMap.inline &&
    (await options.cache.has(mapKey))
  ) {
    let mapStream = options.cache.getStream(mapKey);
    await writeFileStream(
      outputFS,
      fullPath + '.map',
      mapStream,
      info.hashReferences,
      hashRefToNameHash,
    );
  }

  let res = {
    filePath,
    stats: {
      size,
      time: info.time ?? 0,
    },
  };

  api.storeResult(res);
  return res;
}

function writeFileStream(
  fs: FileSystem,
  filePath: FilePath,
  stream: Readable,
  hashReferences: Array<string>,
  hashRefToNameHash: Map<string, string>,
  options: ?FileOptions,
): Promise<number> {
  return new Promise((resolve, reject) => {
    let initialStream = hashReferences.length
      ? stream.pipe(replaceStream(hashRefToNameHash))
      : stream;
    let fsStream = fs.createWriteStream(filePath, options);
    let fsStreamClosed = new Promise(resolve => {
      fsStream.on('close', () => resolve());
    });
    let bytesWritten = 0;
    initialStream
      .pipe(
        new TapStream(buf => {
          bytesWritten += buf.length;
        }),
      )
      .pipe(fsStream)
      .on('finish', () => resolve(fsStreamClosed.then(() => bytesWritten)))
      .on('error', reject);
  });
}

function replaceStream(hashRefToNameHash) {
  let boundaryStr = '';
  return new Transform({
    transform(chunk, encoding, cb) {
      let str = boundaryStr + chunk.toString();
      let replaced = str.replace(HASH_REF_REGEX, match => {
        return hashRefToNameHash.get(match) || match;
      });
      boundaryStr = replaced.slice(replaced.length - BOUNDARY_LENGTH);
      let strUpToBoundary = replaced.slice(
        0,
        replaced.length - BOUNDARY_LENGTH,
      );
      cb(null, strUpToBoundary);
    },

    flush(cb) {
      cb(null, boundaryStr);
    },
  });
}
