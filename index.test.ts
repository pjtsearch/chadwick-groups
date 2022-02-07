import { assertEquals } from "https://deno.land/std@0.125.0/testing/asserts.ts"
import { getGroupsIterations, Prefs, UserId } from "./index.ts"

const data: Record<UserId, Prefs> = {
  a: { wanted: ["b", "c", "d", "z", "q", "w"], unwanted: ["e", "j"] },
  b: { wanted: ["a", "e", "d", "r", "w", "e"], unwanted: ["c", "f"] },
  c: { wanted: ["f", "e", "d", "y", "e", "t"], unwanted: ["b", "a"] },
  d: { wanted: ["f", "b", "c", "u", "r", "y"], unwanted: ["a", "g"] },
  e: { wanted: ["c", "b", "a", "i", "t", "h"], unwanted: ["g", "w"] },
  f: { wanted: ["b", "d", "e", "o", "y", "i"], unwanted: ["h", "x"] },
  g: { wanted: ["a", "c", "e", "p", "u", "o"], unwanted: ["b", "q"] },
  h: { wanted: ["e", "d", "f", "m", "i", "n"], unwanted: ["d", "o"] },
  i: { wanted: ["j", "h", "a", "b", "o", "v"], unwanted: ["f", "l"] },
  j: { wanted: ["d", "c", "e", "c", "p", "x"], unwanted: ["b", "v"] },
  k: { wanted: ["b", "j", "c", "x", "l", "z"], unwanted: ["a", "n"] },
  l: { wanted: ["n", "k", "z", "s", "k", "a"], unwanted: ["g", "m"] },
  m: { wanted: ["j", "t", "w", "a", "h", "r"], unwanted: ["z", "e"] },
  n: { wanted: ["q", "k", "i", "w", "g", "y"], unwanted: ["s", "t"] },
  o: { wanted: ["k", "o", "m", "r", "f", "u"], unwanted: ["h", "j"] },
  p: { wanted: ["u", "c", "j", "y", "s", "i"], unwanted: ["m", "o"] },
  q: { wanted: ["x", "w", "y", "u", "z", "e"], unwanted: ["l", "b"] },
  r: { wanted: ["m", "m", "e", "i", "a", "t"], unwanted: ["g", "n"] },
  s: { wanted: ["c", "u", "a", "o", "q", "y"], unwanted: ["i", "r"] },
  t: { wanted: ["p", "l", "m", "e", "w", "u"], unwanted: ["g", "q"] },
  u: { wanted: ["n", "d", "v", "a", "t", "x"], unwanted: ["c", "o"] },
  v: { wanted: ["y", "g", "x", "b", "u", "s"], unwanted: ["a", "k"] },
  w: { wanted: ["p", "f", "g", "z", "i", "v"], unwanted: ["x", "m"] },
  x: { wanted: ["b", "l", "i", "a", "o", "x"], unwanted: ["n", "v"] },
  y: { wanted: ["q", "l", "o", "b", "r", "r"], unwanted: ["k", "z"] },
  z: { wanted: ["t", "n", "q", "m", "a", "b"], unwanted: ["l", "o"] },
}

Deno.test({
  name: "Should have no unwanted",
  fn() {
    new Array(1000).forEach(() => {
      const unwanted = Object.values(getGroupsIterations(5, data)).flatMap((group) =>
        group.filter((user) => group.some((otherUser) => data[user].unwanted.includes(otherUser)))
      )
      assertEquals(unwanted.length, 0)
    })
  },
})

Deno.test({
  name: "Should have enough wanted",
  fn() {
    new Array(1000).forEach(() =>
      assertEquals(
        Object.values(getGroupsIterations(5, data)).flatMap((group) =>
          group.filter((user) => group.some((otherUser) => data[user].wanted.includes(otherUser)))
        ).length <=
          Object.keys(data).length / 2,
        true
      )
    )
  },
})
