// @flow

import path from 'path';
import {Transformer} from '@parcel/plugin';

function shouldExclude(asset, options) {
  return (
    !asset.isSource ||
    !options.hmrOptions ||
    !asset.env.isBrowser() ||
    asset.env.isWorker() ||
    asset.env.isWorklet() ||
    options.mode !== 'development' ||
    !asset
      .getDependencies()
      .find(v => v.specifier === 'react' || v.specifier === 'react/jsx-runtime')
  );
}

export default (new Transformer({
  async transform({asset, options}) {
    if (shouldExclude(asset, options)) {
      return [asset];
    }

    let wrapperPath = `@parcel/transformer-react-refresh-wrap/${path.basename(
      __dirname,
    )}/helpers/helpers.js`;

    let code = await asset.getCode();
    let map = await asset.getMap();
    let name = `$parcel$ReactRefreshHelpers$${asset.id.slice(-4)}`;

    code = `var ${name} = require(${JSON.stringify(wrapperPath)});
var prevRefreshReg = window.$RefreshReg$;
var prevRefreshSig = window.$RefreshSig$;
${name}.prelude(module);

try {
${code}
  ${name}.postlude(module);
} finally {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}`;

    asset.setCode(code);
    if (map) {
      map.offsetLines(1, 6);
      asset.setMap(map);
    }

    // The JSTransformer has already run, do it manually
    asset.addDependency({
      specifier: wrapperPath,
      specifierType: 'esm',
      resolveFrom: __filename,
    });

    return [asset];
  },
}): Transformer);
