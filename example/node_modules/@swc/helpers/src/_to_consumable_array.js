import arrayWithoutHoles from './_array_without_holes';
import iterableToArray from './_iterable_to_array';
import nonIterableSpread from './_non_iterable_spread';

export default function _toConsumableArray(arr) {
  return arrayWithoutHoles(arr) || iterableToArray(arr) || nonIterableSpread();
}
