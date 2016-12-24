# Memory Leak Testing for Node - Draft

## Usage Idea

```js
import myLib from 'my-lib'
import { iterate } from 'not-yet-built-memleak-lib'

beforeAll(() => {
  setUpEnvironment()
})

describe('myLib', () => {
  it('does not leak when doing stuff 1k times', () => {
    iterate(1000, () => {
      const instance = myLib.createInstance()
      instance.doStuff('foo', 'bar')
    })
  })
})
```

This allows the library to be used with different test runners. But: You must make sure to **run all tests serially** yourself.


## How does it work?

You specify an iteration: A function and how often this function shall be run. Garbage collection is triggered 6 times until the end of the iteration (so iteration count must be >= 5).

If the heap size increased over more than 3 subsequent GCs an error is thrown.


## Usage

```sh
mocha test/sample.test.js --heap-file heap-diff.json
```
