import arrayWithHoles from './_array_with_holes';
import iterableToArrayLimit from './_iterable_to_array';
import nonIterableRest from './_non_iterable_rest';

export default function _slicedToArray(arr, i) {
  return arrayWithHoles(arr) || iterableToArrayLimit(arr, i) || nonIterableRest();
}