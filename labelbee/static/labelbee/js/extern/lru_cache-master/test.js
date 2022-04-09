// Test which will run in nodejs
// $ node test.js
// (Might work with other CommonJS-compatible environments)
'use strict'

var assert = require('assert')
var LRUCache = require('./index').LRUCache
var c = new LRUCache(4)

c.put('adam', 29)
c.put('john', 26)
c.put('angela', 24)
c.put('bob', 48)
assert.equal(c.toString(), 'adam:29 < john:26 < angela:24 < bob:48')

assert.equal(c.get('adam'), 29)
assert.equal(c.get('john'), 26)
assert.equal(c.get('angela'), 24)
assert.equal(c.get('bob'), 48)
assert.equal(c.toString(), 'adam:29 < john:26 < angela:24 < bob:48')

assert.equal(c.get('angela'), 24)
assert.equal(c.toString(), 'adam:29 < john:26 < bob:48 < angela:24')

c.put('ygwie', 81)
assert.equal(c.toString(), 'john:26 < bob:48 < angela:24 < ygwie:81')
assert.equal(c.get('adam'), undefined)

c.set('john', 11)
assert.equal(c.toString(), 'bob:48 < angela:24 < ygwie:81 < john:11')
assert.equal(c.get('john'), 11)

var expectedKeys = ['bob', 'angela', 'ygwie', 'john']
c.forEach(function (k, v) {
  // sys.puts(k+': '+v)
  assert.equal(k, expectedKeys.shift())
})

var current_size = c.size
c.remove('john')
assert.equal(current_size - 1, c.size)

// test remove
var to_remove = new LRUCache(4)
to_remove.put('adam', 29)
to_remove.put('john', 26)
to_remove.remove('adam')
to_remove.remove('john')
assert.equal(to_remove.size, 0)
assert.equal(to_remove.head, undefined)
assert.equal(to_remove.tail, undefined)

// test shift
c = new LRUCache(4)
assert.equal(c.size, 0)
c.put('a', 1)
c.put('b', 2)
c.put('c', 3)
assert.equal(c.size, 3)
var e = c.shift()
assert.equal(e.key, 'a')
assert.equal(e.value, 1)
e = c.shift()
assert.equal(e.key, 'b')
assert.equal(e.value, 2)
e = c.shift()
assert.equal(e.key, 'c')
assert.equal(e.value, 3)
// test that forEach does not execute against any entries
c.forEach(function () { assert(false) }, true)
assert.equal(c.size, 0)

c = new LRUCache(4)

c.put(0, 1)
c.put(0, 2)
c.put(0, 3)
c.put(0, 4)

assert.equal(c.size, 4)
assert.deepEqual(c.shift(), { key: 0, value: 1, newer: undefined, older: undefined })
assert.deepEqual(c.shift(), { key: 0, value: 2, newer: undefined, older: undefined })
assert.deepEqual(c.shift(), { key: 0, value: 3, newer: undefined, older: undefined })
assert.deepEqual(c.shift(), { key: 0, value: 4, newer: undefined, older: undefined })
assert.equal(c.size, 0) // check .size correct
c.forEach(function () { assert(false) }, undefined, true)  // check .tail correct

// test fixed capacity
c = new LRUCache(2)

c.put('one', 1)
c.put('two', 2)
c.put('three', 3)
c.put('four', 4)
c.put('five', 5)
c.put('six', 6)
c.put('seven', 7)
c.put('eight', 8)

assert.strictEqual(c.size, 2)
assert.strictEqual(c.limit, 2)
assert.strictEqual(Object.keys(c._keymap).length, 2)

// If we made it down here, all tests passed. Neat.
console.log('All tests passed!')
