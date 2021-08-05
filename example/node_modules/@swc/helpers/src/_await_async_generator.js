import AwaitValue from './_await_value';

export default function _awaitAsyncGenerator(value) {
  return new AwaitValue(value);
}
