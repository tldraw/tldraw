// @flow
import type {BaseAsset} from '@parcel/types';

export type BabelError = Error & {
  loc?: {
    line: number,
    column: number,
    ...
  },
  source?: string,
  filePath?: string,
  ...
};

export async function babelErrorEnhancer(
  error: BabelError,
  asset: BaseAsset,
): Promise<BabelError> {
  if (error.loc) {
    let start = error.message.startsWith(asset.filePath)
      ? asset.filePath.length + 1
      : 0;
    error.message = error.message
      .slice(start)
      .split('\n')[0]
      .trim();
  }

  error.source = await asset.getCode();
  error.filePath = asset.filePath;

  return error;
}
