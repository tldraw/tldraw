// @flow

import type {Environment} from '@parcel/types';
import type {Targets as BabelTargets} from '@babel/preset-env';

import invariant from 'assert';
import semver from 'semver';
import {TargetNames} from '@babel/helper-compilation-targets/lib/options';

// List of browsers to exclude when the esmodule target is specified.
// Based on https://caniuse.com/#feat=es6-module
const ESMODULE_BROWSERS = [
  'not ie <= 11',
  'not edge < 16',
  'not firefox < 60',
  'not chrome < 61',
  'not safari < 11',
  'not opera < 48',
  'not ios_saf < 11',
  'not op_mini all',
  'not android < 76',
  'not blackberry > 0',
  'not op_mob > 0',
  'not and_chr < 76',
  'not and_ff < 68',
  'not ie_mob > 0',
  'not and_uc > 0',
  'not samsung < 8.2',
  'not and_qq > 0',
  'not baidu > 0',
  'not kaios > 0',
];

export function enginesToBabelTargets(env: Environment): BabelTargets {
  // "Targets" is the name @babel/preset-env uses for what Parcel calls engines.
  // This should not be confused with Parcel's own targets.
  // Unlike Parcel's engines, @babel/preset-env expects to work with minimum
  // versions, not semver ranges, of its targets.
  let targets = {};
  for (let engineName of Object.keys(env.engines)) {
    let engineValue = env.engines[engineName];

    // if the engineValue is a string, it might be a semver range. Use the minimum
    // possible version instead.
    if (engineName === 'browsers') {
      targets[engineName] = engineValue;
    } else {
      invariant(typeof engineValue === 'string');
      if (!TargetNames.hasOwnProperty(engineName)) continue;
      let minVersion = getMinSemver(engineValue);
      targets[engineName] = minVersion ?? engineValue;
    }
  }

  if (env.outputFormat === 'esmodule' && env.isBrowser()) {
    // If there is already a browsers target, add a blacklist to exclude
    // instead of using babel's esmodules target. This allows specifying
    // a newer set of browsers than the baseline esmodule support list.
    // See https://github.com/babel/babel/issues/8809.
    if (targets.browsers) {
      let browsers = Array.isArray(targets.browsers)
        ? targets.browsers
        : [targets.browsers];
      targets.browsers = [...browsers, ...ESMODULE_BROWSERS];
    } else {
      targets.esmodules = true;
    }
  }

  return targets;
}

// TODO: Replace with `minVersion` (https://github.com/npm/node-semver#ranges-1)
//       once semver has been upgraded across Parcel.
export function getMinSemver(version: string): ?string {
  try {
    let range = new semver.Range(version);
    let sorted = range.set.sort((a, b) => a[0].semver.compare(b[0].semver));
    return sorted[0][0].semver.version;
  } catch (err) {
    return null;
  }
}
