import range from "lodash.range"
import {
  balanceGender,
  compareGroupsByPreference,
  getGroupScore,
  getGroupsIterations,
  getUnwantedAmount,
  getWantedAmount,
  groupLessWantedUser,
  groupWantsUser,
  Options,
  withUnusedUsers,
} from "./"

const options: Options = {
  data: {
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
  },
  groupSize: 4,
  initial: {
    "1": [],
    "2": [],
    "3": [],
    "4": [],
    "5": [],
    "6": [],
    "7": [],
    "8": [],
    "9": [],
    "10": [],
    "11": [],
    "12": [],
    "13": [],
  },
}

test("Should have no unwanted", () => {
  range(10).forEach(() => {
    const unwanted = Object.values(getGroupsIterations(5, options)).flatMap((group) =>
      group.filter((user) => group.some((otherUser) => options.data[user].unwanted.includes(otherUser)))
    )
    expect(unwanted.length).toBe(0)
  })
})

test("Should have enough wanted", () => {
  range(10).forEach(() => {
    const res = getGroupsIterations(10, options)
    expect(getWantedAmount(res, options)).toBeGreaterThanOrEqual(Object.values(res).flat().length / 1.2)
  })
})

test("Should have all users", () => {
  range(10).forEach(() => {
    const groupedUsers = Object.values(getGroupsIterations(10, options)).flat()
    expect(groupedUsers.sort()).toEqual(Object.keys(options.data).sort())
  })
})

test("Should have gender balance", () => {
  range(10).forEach(() => {
    const groupsGenders = Object.values(getGroupsIterations(10, options))
      .map((group) => group.map((user) => options.data[user].gender))
      .filter((g) => g.length > 0)
    const difference = groupsGenders.map((group) =>
      Math.abs(options.groupSize / 2 - group.filter((g) => g == "male").length)
    )
    const avgDiff = difference.reduce((total, curr) => total + curr, 0) / groupsGenders.length
    expect(avgDiff).toBeLessThanOrEqual(1)
  })
})

test("Should get wanted amount", () => {
  expect(
    getWantedAmount(
      {
        a: ["a", "b", "c"],
      },
      options
    )
  ).toBe(2)
})

test("Should get unwanted amount", () => {
  expect(
    getUnwantedAmount(
      {
        a: ["a", "b", "c"],
      },
      options
    )
  ).toBe(2)
})

test("Should get correct group score", () => {
  expect(getGroupScore(["a", "b", "c"], "b", options)).toBe(-2012)
  expect(getGroupScore(["a", "b", "c"], "a", options)).toBe(-1982)
  expect(getGroupScore(["a", "b", "c"], "c", options)).toBe(-2012)
})

test("Should balance gender", () => {
  expect(balanceGender(["a", "b", "c"], "female", options)).toEqual(["a", "b", "c"])
  expect(balanceGender(["a", "b", "c"], "male", options)).toEqual(["a", "c"])
})

test("Should get if group wants user", () => {
  expect(groupWantsUser("f", ["a", "b", "c"], options)).toBe(true)
  expect(groupLessWantedUser("f", ["a", "b", "c"], options)).toBe("b")
  expect(groupWantsUser("d", ["a", "b", "c"], options)).toBe(true)
  expect(groupLessWantedUser("d", ["a", "b", "c"], options)).toBe("a")
  expect(groupWantsUser("e", ["a", "b", "c"], options)).toBe(true)
  expect(groupLessWantedUser("e", ["a", "b", "c"], options)).toBe("a")
})

test("Should compare groups by preference", () => {
  expect(
    compareGroupsByPreference(
      { wanted: ["a", "b", "c"], unwanted: ["d", "e", "f"], gender: "male" },
      ["a", "b", "d"],
      ["a", "b", "e"]
    )
  ).toBe(0)
  expect(
    compareGroupsByPreference(
      { wanted: ["a", "b", "c"], unwanted: ["d", "e", "f"], gender: "male" },
      ["a", "b", "d"],
      ["a", "b", "c"]
    )
  ).toBe(1998)
  expect(
    compareGroupsByPreference(
      { wanted: ["a", "b", "c"], unwanted: ["d", "e", "f"], gender: "male" },
      ["a", "b", "d"],
      ["a", "e", "d"]
    )
  ).toBe(-1988)
})

test("Should add unused users", () => {
  expect(
    withUnusedUsers({
      ...options,
      data: {
        a: { unwanted: ["b"], wanted: [], gender: "male" },
        b: { unwanted: [], wanted: [], gender: "female" },
        c: { unwanted: ["d"], wanted: [], gender: "male" },
        d: { unwanted: [], wanted: [], gender: "female" },
      },
    })({
      a: ["a"],
      b: ["b"],
    })
  ).toEqual({
    a: ["a", "c"],
    b: ["b", "d"],
  })

  expect(
    withUnusedUsers({
      ...options,
      data: {
        a: { unwanted: ["b"], wanted: [], gender: "male" },
        b: { unwanted: [], wanted: [], gender: "female" },
        c: { unwanted: ["d"], wanted: [], gender: "male" },
        d: { unwanted: [], wanted: [], gender: "female" },
        e: { unwanted: ["a"], wanted: [], gender: "male" },
        f: { unwanted: [], wanted: [], gender: "female" },
        g: { unwanted: ["c"], wanted: [], gender: "male" },
        h: { unwanted: [], wanted: [], gender: "female" },
      },
    })({
      a: ["a"],
      b: ["b"],
    })
  ).toEqual({
    a: ["a", "c", "f", "h"],
    b: ["b", "d", "e", "g"],
  })
})
