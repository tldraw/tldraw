import arrayWithHoles from './_array_with_holes';
import iterableToArray from './_iterable_to_array';
import nonIterableRest from './_non_iterable_rest';

export default function _toArray(arr) {
  return arrayWithHoles(arr) || iterableToArray(arr) || nonIterableRest();
}
