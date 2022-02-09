import { assertEquals } from "https://deno.land/std@0.125.0/testing/asserts.ts"
import { getGroupsIterations, getWantedAmount, Prefs, UserId } from "./index.ts"

const data: Record<UserId, Prefs> = {
  a: { wanted: ["b", "c", "d", "z", "q", "w"], unwanted: ["e", "j"], gender: "male" },
  b: { wanted: ["a", "e", "d", "r", "w", "e"], unwanted: ["c", "f"], gender: "male" },
  c: { wanted: ["f", "e", "d", "y", "e", "t"], unwanted: ["b", "a"], gender: "male" },
  d: { wanted: ["f", "b", "c", "u", "r", "y"], unwanted: ["a", "g"], gender: "male" },
  e: { wanted: ["c", "b", "a", "i", "t", "h"], unwanted: ["g", "w"], gender: "male" },
  f: { wanted: ["b", "d", "e", "o", "y", "i"], unwanted: ["h", "x"], gender: "male" },
  g: { wanted: ["a", "c", "e", "p", "u", "o"], unwanted: ["b", "q"], gender: "male" },
  h: { wanted: ["e", "d", "f", "m", "i", "n"], unwanted: ["d", "o"], gender: "male" },
  i: { wanted: ["j", "h", "a", "b", "o", "v"], unwanted: ["f", "l"], gender: "male" },
  j: { wanted: ["d", "c", "e", "c", "p", "x"], unwanted: ["b", "v"], gender: "male" },
  k: { wanted: ["b", "j", "c", "x", "l", "z"], unwanted: ["a", "n"], gender: "male" },
  l: { wanted: ["n", "k", "z", "s", "k", "a"], unwanted: ["g", "m"], gender: "male" },
  m: { wanted: ["j", "t", "w", "a", "h", "r"], unwanted: ["z", "e"], gender: "female" },
  n: { wanted: ["q", "k", "i", "w", "g", "y"], unwanted: ["s", "t"], gender: "female" },
  o: { wanted: ["k", "o", "m", "r", "f", "u"], unwanted: ["h", "j"], gender: "female" },
  p: { wanted: ["u", "c", "j", "y", "s", "i"], unwanted: ["m", "o"], gender: "female" },
  q: { wanted: ["x", "w", "y", "u", "z", "e"], unwanted: ["l", "b"], gender: "female" },
  r: { wanted: ["m", "m", "e", "i", "a", "t"], unwanted: ["g", "n"], gender: "female" },
  s: { wanted: ["c", "u", "a", "o", "q", "y"], unwanted: ["i", "r"], gender: "female" },
  t: { wanted: ["p", "l", "m", "e", "w", "u"], unwanted: ["g", "q"], gender: "female" },
  u: { wanted: ["n", "d", "v", "a", "t", "x"], unwanted: ["c", "o"], gender: "female" },
  v: { wanted: ["y", "g", "x", "b", "u", "s"], unwanted: ["a", "k"], gender: "female" },
  w: { wanted: ["p", "f", "g", "z", "i", "v"], unwanted: ["x", "m"], gender: "female" },
  x: { wanted: ["b", "l", "i", "a", "o", "x"], unwanted: ["n", "v"], gender: "female" },
  y: { wanted: ["q", "l", "o", "b", "r", "r"], unwanted: ["k", "z"], gender: "female" },
  z: { wanted: ["t", "n", "q", "m", "a", "b"], unwanted: ["l", "o"], gender: "female" },
}

Deno.test({
  name: "Should have no unwanted",
  fn() {
    new Array(1000).forEach(() => {
      const unwanted = Object.values(getGroupsIterations(1000, data)).flatMap((group) =>
        group.filter((user) => group.some((otherUser) => data[user].unwanted.includes(otherUser)))
      )
      assertEquals(unwanted.length, 0)
    })
  },
})

Deno.test({
  name: "Should have enough wanted",
  fn() {
    const res = getGroupsIterations(1000, data)
    assertEquals(getWantedAmount(res, data) >= Object.values(res).flat().length / 1.2, true)
  },
})

Deno.test({
  name: "Should have all users",
  fn() {
    const groupedUsers = Object.values(getGroupsIterations(100, data)).flat()
    assertEquals(groupedUsers.length, Object.keys(data).length)
  },
})
