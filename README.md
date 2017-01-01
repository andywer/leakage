# Leakage - Memory Leak Testing for Node

[![Build Status](https://travis-ci.org/andywer/leakage.svg?branch=master)](https://travis-ci.org/andywer/leakage) [![NPM Version](https://img.shields.io/npm/v/leakage.svg)](https://www.npmjs.com/package/leakage) [![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

Write leakage tests using your favorite test runner (Mocha, Jest, AVA, ...).

Does not only support spotting and fixing memory leaks, but writing tests also enables you to prevent regressions and show that the code does not leak.

<p align="center">
  <img alt="Screencast" width="600px" src="https://github.com/andywer/leakage/raw/master/docs/failing-test.png?raw=true" />
</p>


## Why do we need that?

Since every JavaScript runtime comes with a garbage collector you should not have to care about memory allocation / freeing memory at all, right? **Sadly not.**

Memory leaks are a common problem in pretty much every programming language. Memory gets allocated, but is not freed again, leading to a steadily increasing usage of memory. Since the memory you use is finite your application will eventually crash or become so slow it is rendered useless.

As soon as you keep a reference to an object, array, arrow function, ... you do not necessarily use anymore you might have already created a memory leak. Creating an object (incl. arrays and closures) means allocating heap memory that will be freed by the next automatic garbage collection only if all references to this object have vanished.


## Usage with Mocha / Jest

```js
import myLib from 'my-lib'
import { iterate } from 'leakage'

describe('myLib', () => {
  it('does not leak when doing stuff 1k times', () => {
    iterate(1000, () => {
      const instance = myLib.createInstance()
      instance.doStuff('foo', 'bar')
    })
  })
})
```

`iterate()` will run the arrow function 1000 times and throw an error if a memory leak has been detected.

**Make sure you run all tests serially** in order to get clean heap diffs. Mocha should run them sequentially by default. Use `--runInBand` for Jest.


## Usage with AVA / tape

```js
import test from 'ava'
import myLib from 'my-lib'
import { iterate } from 'leakage'

test('myLib does not leak when doing stuff 1k times', () => {
  iterate(1000, () => {
    const instance = myLib.createInstance()
    instance.doStuff('foo', 'bar')
  })
})
```

`iterate()` will run the arrow function 1000 times and throw an error if a memory leak has been detected.

**Make sure you run all tests serially** in order to get clean heap diffs. Tape should run them sequentially by default. Use `--serial` for AVA.


## CLI parameters

You can pass special CLI parameters for `leakage` to your test runner:

```sh
mocha test/sample.test.js --heap-file heap-diff.json
```

`--heap-file <output file path>` will make the library write a detailed heap diff JSON to the file system. Make sure you only run a single test using `it.only`. Otherwise you will only find the heap diff of the last test in the file. Useful for debugging.


## Inner workings

Leakage uses `memwatch-next` to trigger the garbage collector and create heap diffs.

You just specify an iteration: A function and how often this function shall be run. Garbage collection is triggered 6 times until the end of the iteration (so iteration count must be >= 5).

If the heap size increased over more than 3 subsequent garbage collections an error is thrown.


## Travis CI

You might want your leakage tests to be run by your CI service. There is an issue with Travis CI's linux containers, `g++` and a transitive dependency of `memwatch-next` ([nan](https://www.npmjs.com/package/nan)).

Fortunately there is a fix: You need to install and use version `4.8` of `g++` in order to compile the dependency.

Have a look at leakage's [.travis.yml](./.travis.yml) file to see how it can be done or find further details by @btmills in this [issue](https://github.com/andywer/leakage/issues/4#issuecomment-269449814).


## Feedback

Got any feedback, suggestions, ...? Feel free to open an [issue](https://github.com/andywer/leakage/issues) and share your thoughts!

Have an improvement? Open a pull request any time.


## To Do

* Support async functions (a.k.a. Promise support)


## License

Released under the terms of the MIT license. See [LICENSE](./LICENSE) for details.
