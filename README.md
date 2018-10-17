# Leakage - Memory Leak Testing for Node

[![Build Status](https://travis-ci.org/andywer/leakage.svg?branch=master)](https://travis-ci.org/andywer/leakage) [![NPM Version](https://img.shields.io/npm/v/leakage.svg)](https://www.npmjs.com/package/leakage) [![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

Write leakage tests using Mocha or another test runner of your choice.

Does not only support spotting and fixing memory leaks, but writing tests also enables you to prevent regressions and show that the code does not leak.

<p align="center">
  <img alt="Screencast" width="600px" src="https://github.com/andywer/leakage/raw/master/docs/failing-test.png?raw=true" />
</p>


## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Memory Management in JS?](#memory-management-in-js)
- [API](#api)
- [Under the Hood](#under-the-hood)
- [Travis CI](#travis-ci)
- [FAQ](#faq)
- [Contribute](#contribute)
- [License](#license)


## Installation

```sh
npm install --save-dev leakage
# or
yarn --dev leakage
```


## Usage

In theory you could use any testing framework to run leakage tests. In practice, though, you want to use one that generates a minimal memory overhead itself. We suggest using Mocha or Tape, since they are quite simple and don't produce much noise in the captured data.

### Usage with Mocha

```js
import myLib from 'my-lib'
import { iterate } from 'leakage'

describe('myLib', () => {
  it('does not leak when doing stuff', () => {
    iterate(() => {
      const instance = myLib.createInstance()
      instance.doStuff('foo', 'bar')
    })
  })
})
```

`iterate()` will run the function several times, create a heap snapshot and repeat that process until there is a set of heap diffs. If a memory leak has been detected an error with some debugging information will be thrown.

**Make sure you run all tests serially** in order to get clean heap diffs. Mocha should run them sequentially by default.

Use `iterate.async()` for asynchronous test code. See [Asynchronous Tests](#asynchronous-tests) and [API](#api) for details.


### Usage with tape

```js
import test from 'tape'
import myLib from 'my-lib'
import { iterate } from 'leakage'

test('myLib does not leak when doing stuff', () => {
  iterate(() => {
    const instance = myLib.createInstance()
    instance.doStuff('foo', 'bar')
  })
})
```


### Asynchronous Tests

Use `iterate.async()` to test asynchronous code. The iterator function is supposed to return a promise and `iterate.async()` will return a promise itself. In case of a memory leak that returned promise will be rejected instead of `iterate` failing synchronously.

*Do not forget to return the promise in your test or use async functions and `await iterate.async()`.*

```js
import fetch from 'isomorphic-fetch'
import { iterate } from 'leakage'

describe('isomorphic-fetch', () => {
  it('does not leak when requesting data and parsing JSON', async () => {
    await iterate.async(async () => {
      const response = await fetch()
      await response.json()
    })
  })
})
```


## Memory Management in JS?

Since every JavaScript runtime comes with a garbage collector you should not have to care about memory allocation / freeing memory at all, right? **Sadly not.**

Memory leaks are a common problem in most programming languages. Memory gets allocated, but is not freed again, leading to a steadily increasing usage of memory. Since the memory you use is finite your application will eventually crash or become so slow it is rendered useless.

As soon as you still have a reference to an object, array, arrow function, ... you do not use anymore you might have already created a memory leak. Creating an object (incl. arrays and closures) means allocating heap memory that will be freed by the next automatic garbage collection only if all references to this object have vanished.


## API

### iterate(syncIterator: Function, options: ?Object): Result

Test for memory leaks. Will throw an error when a leak is recognized.

`syncIterator` can be any synchronous function. Let it perform your operations you want to test for memory leaks.

`options.iterations` is the number the iterator function is run for each heap diff / garbage collection. Defaults to `30`.

`options.gcollections` is the number of heap snapshots to create. Defaults to `60`.

### iterate.async(asyncIterator: Function, options: ?Object): Promise<Result>

Test for memory leaks. Will return a rejecting promise when a leak is recognized.

`asyncIterator` can be any asynchronous function. Let it perform your operations you want to test for memory leaks.

`options.iterations` is the number the iterator function is run for each heap diff / garbage collection. Defaults to `30`.

`options.gcollections` is the number of heap snapshots to create. Defaults to `60`.

### Result object

Properties:
* `heapDiffs` - An array of heap diffs as created by `node-memwatch`
* `iterations` - The number of iterator runs per heap diff
* `gcollections` - The number of garbage collections / heap diffs performed

Methods:
* `printSummary(title: ?String, log: ?Function)` - Prints a short summary. Can pass a title to print. `log` is the function used to output the summary line by line. Defaults to `console.log`.

### MemoryLeakError

Memory leak errors are instances of this custom error. You can use it to check if an error is really a memory leak error or just a generic kind of problem (like a broken reference).

Import it as `const { MemoryLeakError } = require('leakage')`.


### CLI Parameters

You can pass special CLI parameters for `leakage` to your test runner:

```sh
mocha test/sample.test.js --heap-file heap-diff.json
```

#### --heap-file <output file path>

Will make the library write a detailed heap diff JSON to the file system. Make sure you only run a single test using `it.only`. Otherwise you will only find the heap diff of the last test in the file. Useful for debugging.


## Under the Hood

Leakage uses `node-memwatch` to trigger the garbage collector and create heap diffs.

You just specify an iterator function. It will be run 30 times by default then a garbage collection will be performed and a heap snapshot will be made. This process is iterated 6 times by default to collect several heap diffs, since especially in async tests there is always a bit of background noise.

If the heap size increased over more than `[heapDiffCount * 2 / 3]` subsequent garbage collections an error is thrown.


## Travis CI

You might want your leakage tests to be run by your CI service. There is an issue with Travis CI's linux containers, `g++` and a transitive dependency of `node-memwatch` ([nan](https://www.npmjs.com/package/nan)).

Fortunately there is a fix: You need to install and use version `4.8` of `g++` in order to compile the dependency.

Have a look at leakage's [.travis.yml](./.travis.yml) file to see how it can be done or find further details by @btmills in this [issue](https://github.com/andywer/leakage/issues/4#issuecomment-269449814).


## FAQ

<details>
<summary>I encountered a timeout error</summary>

If you see an error like `Error: Timeout of 2000ms exceeded. (...)` it means that your test took so long that the test runner cancelled it.

You can easily increase the timeout. Have a look at your test runner's documentation for that. When using Mocha, for instance, you can run it with `--timeout 10000` to increase the timeout to 10000ms (10s).
</details>

<details>
<summary>Why are my tests slow anyway?</summary>

Leakage tests are rather slow compared to usual unit tests, since heap snapshotting and diffing takes some time and has to be done several times per test.

You can try to reduce the number of heap diffs created, but beware that fewer heap diffs can result in less accurate results. See [API](#api) for details.
</details>


## Contribute

Got any feedback, suggestions, ...? Feel free to open an [issue](https://github.com/andywer/leakage/issues) and share your thoughts!

Used it successfully or were unable to use it? Let us know!

Have an improvement? Open a pull request any time.


## License

Released under the terms of the MIT license. See [LICENSE](./LICENSE) for details.
