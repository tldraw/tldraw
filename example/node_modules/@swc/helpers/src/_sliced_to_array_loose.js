import arrayWithHoles from './_array_with_holes';
import iterableToArrayLimitLoose from './_iterable_to_array_limit_loose';
import nonIterableRest from './_non_iterable_rest';

export default function _slicedToArrayLoose(arr, i) {
  return arrayWithHoles(arr) || iterableToArrayLimitLoose(arr, i) || nonIterableRest();
}
