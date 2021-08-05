// @flow strict-local
import type {FileSystem} from './types';
import type {FilePath} from '@parcel/types';
import path from 'path';

export type * from './types';
export * from './NodeFS';
export * from './MemoryFS';
export * from './OverlayFS';

// Recursively copies a directory from the sourceFS to the destinationFS
export async function ncp(
  sourceFS: FileSystem,
  source: FilePath,
  destinationFS: FileSystem,
  destination: FilePath,
) {
  await destinationFS.mkdirp(destination);
  let files = await sourceFS.readdir(source);
  for (let file of files) {
    let sourcePath = path.join(source, file);
    let destPath = path.join(destination, file);
    let stats = await sourceFS.stat(sourcePath);
    if (stats.isFile()) {
      await new Promise((resolve, reject) => {
        sourceFS
          .createReadStream(sourcePath)
          .pipe(destinationFS.createWriteStream(destPath))
          .on('finish', () => resolve())
          .on('error', reject);
      });
    } else if (stats.isDirectory()) {
      await ncp(sourceFS, sourcePath, destinationFS, destPath);
    }
  }
}
