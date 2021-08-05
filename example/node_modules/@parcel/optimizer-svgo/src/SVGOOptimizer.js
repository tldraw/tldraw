// @flow

import {Optimizer} from '@parcel/plugin';
import ThrowableDiagnostic from '@parcel/diagnostic';
import {blobToString} from '@parcel/utils';

import * as svgo from 'svgo';
import path from 'path';

export default (new Optimizer({
  async loadConfig({config}) {
    let configFile = await config.getConfig([
      'svgo.config.js',
      'svgo.config.json',
    ]);

    if (configFile) {
      let isJavascript = path.extname(configFile.filePath) === '.js';
      if (isJavascript) {
        config.invalidateOnStartup();
      }
      return configFile.contents;
    }
  },

  async optimize({bundle, contents, config}) {
    if (!bundle.env.shouldOptimize) {
      return {contents};
    }

    let code = await blobToString(contents);
    let result = svgo.optimize(code, config);
    if (result.error != null) {
      throw new ThrowableDiagnostic({
        diagnostic: {
          message: result.error,
        },
      });
    }

    return {contents: result.data};
  },
}): Optimizer);
