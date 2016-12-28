module.exports = {
  createInstance
}

let nextId = 1
let lastInstance = null

function createInstance () {
  const newInstance = new SampleInstance({
    id: nextId++,
    prev: lastInstance,     // <- this is going to be our memory leak
    doStuff () {
      return newInstance.id * 2
    }
  })
  lastInstance = newInstance
  return newInstance
}

// Using constructors instead of plain objects is a good habit
// to get more useful debugging data
function SampleInstance (data) {
  Object.assign(this, data)
}
