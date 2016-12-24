module.exports = {
  createInstance
}

let nextId = 1
let lastInstance = null

function createInstance () {
  const newInstance = {
    id: nextId++,
    prev: lastInstance,     // <- this is going to be our memory leak
    doStuff () {
      return newInstance.id * 2
    }
  }
  lastInstance = newInstance
  return newInstance
}
