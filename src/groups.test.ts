import { find, range } from "lodash/fp"

import {
  avgWithoutZero,
  balanceGender,
  compareGroupsByPreference,
  getGroupScore,
  getGroupsIterations,
  getUnwantedAmount,
  getWantedAmount,
  getGroupLessWantedUser,
  groupWantsUser,
  Options,
  wantedPerUser,
  withUnusedUsers,
} from "./groups"

const options: Options = {
  data: [
    { id: "a", wanted: ["b", "c", "d", "z", "q", "w"], unwanted: ["e", "j"], gender: "male" },
    { id: "b", wanted: ["a", "e", "d", "r", "w", "e"], unwanted: ["c", "f"], gender: "male" },
    { id: "c", wanted: ["f", "e", "d", "y", "e", "t"], unwanted: ["b", "a"], gender: "male" },
    { id: "d", wanted: ["f", "b", "c", "u", "r", "y"], unwanted: ["a", "g"], gender: "male" },
    { id: "e", wanted: ["c", "b", "a", "i", "t", "h"], unwanted: ["g", "w"], gender: "male" },
    { id: "f", wanted: ["b", "d", "e", "o", "y", "i"], unwanted: ["h", "x"], gender: "male" },
    { id: "g", wanted: ["a", "c", "e", "p", "u", "o"], unwanted: ["b", "q"], gender: "male" },
    { id: "h", wanted: ["e", "d", "f", "m", "i", "n"], unwanted: ["d", "o"], gender: "male" },
    { id: "i", wanted: ["j", "h", "a", "b", "o", "v"], unwanted: ["f", "l"], gender: "male" },
    { id: "j", wanted: ["d", "c", "e", "c", "p", "x"], unwanted: ["b", "v"], gender: "male" },
    { id: "k", wanted: ["b", "j", "c", "x", "l", "z"], unwanted: ["a", "n"], gender: "male" },
    { id: "l", wanted: ["n", "k", "z", "s", "k", "a"], unwanted: ["g", "m"], gender: "male" },
    { id: "m", wanted: ["j", "t", "w", "a", "h", "r"], unwanted: ["z", "e"], gender: "female" },
    { id: "n", wanted: ["q", "k", "i", "w", "g", "y"], unwanted: ["s", "t"], gender: "female" },
    { id: "o", wanted: ["k", "o", "m", "r", "f", "u"], unwanted: ["h", "j"], gender: "female" },
    { id: "p", wanted: ["u", "c", "j", "y", "s", "i"], unwanted: ["m", "o"], gender: "female" },
    { id: "q", wanted: ["x", "w", "y", "u", "z", "e"], unwanted: ["l", "b"], gender: "female" },
    { id: "r", wanted: ["m", "m", "e", "i", "a", "t"], unwanted: ["g", "n"], gender: "female" },
    { id: "s", wanted: ["c", "u", "a", "o", "q", "y"], unwanted: ["i", "r"], gender: "female" },
    { id: "t", wanted: ["p", "l", "m", "e", "w", "u"], unwanted: ["g", "q"], gender: "female" },
    { id: "u", wanted: ["n", "d", "v", "a", "t", "x"], unwanted: ["c", "o"], gender: "female" },
    { id: "v", wanted: ["y", "g", "x", "b", "u", "s"], unwanted: ["a", "k"], gender: "female" },
    { id: "w", wanted: ["p", "f", "g", "z", "i", "v"], unwanted: ["x", "m"], gender: "female" },
    { id: "x", wanted: ["b", "l", "i", "a", "o", "x"], unwanted: ["n", "v"], gender: "female" },
    { id: "y", wanted: ["q", "l", "o", "b", "r", "r"], unwanted: ["k", "z"], gender: "female" },
    { id: "z", wanted: ["t", "n", "q", "m", "a", "b"], unwanted: ["l", "o"], gender: "female" },
  ],
  groupSize: 4,
  initial: [
    { id: "1", users: [] },
    { id: "2", users: [] },
    { id: "3", users: [] },
    { id: "4", users: [] },
    { id: "5", users: [] },
    { id: "6", users: [] },
    { id: "7", users: [] },
    { id: "8", users: [] },
    { id: "9", users: [] },
    { id: "10", users: [] },
    { id: "11", users: [] },
    { id: "12", users: [] },
    { id: "13", users: [] },
  ],
  desiredWantedAmount: 1,
}

test("Should have no unwanted", () => {
  range(0)(10).forEach(() => {
    const unwanted = getGroupsIterations(100, options).flatMap((group) =>
      group.users.filter((user) =>
        group.users.some((otherUser) =>
          find({ id: user }, options.data)!.unwanted.includes(otherUser)
        )
      )
    )
    expect(unwanted.length).toBe(0)
  })
})

test("Should have enough wanted", () => {
  range(0)(10).forEach(() => {
    const res = getGroupsIterations(30, options)
    expect(getWantedAmount(options)(res)).toBeGreaterThanOrEqual(
      res.flatMap(({ users }) => users).length / 1.3
    )
  })
})

test("Should have enough wanted per user", () => {
  range(0)(10).forEach(() => {
    const wanted = wantedPerUser(options, getGroupsIterations(100, options))
    const res = avgWithoutZero(wanted)
    expect(res).toBeLessThanOrEqual(1.75)
    expect(res).toBeGreaterThanOrEqual(0.9)
    expect(wanted.filter((a) => a == 0).length).toBeLessThanOrEqual(2)
  })
})

test("Should have all users", () => {
  range(0)(10).forEach(() => {
    const groupedUsers = getGroupsIterations(10, options).flatMap(({ users }) => users)
    expect(groupedUsers.sort()).toEqual(options.data.map(({ id }) => id).sort())
  })
})

test("Should have gender balance", () => {
  range(0)(10).forEach(() => {
    const groupsGenders = getGroupsIterations(10, options)
      .map((group) => group.users.map((user) => find({ id: user }, options.data)!.gender))
      .filter((g) => g.length > 0)
    const difference = groupsGenders.map((group) =>
      Math.abs(options.groupSize / 2 - group.filter((g) => g == "male").length)
    )
    const avgDiff = difference.reduce((total, curr) => total + curr, 0) / groupsGenders.length
    expect(avgDiff).toBeLessThanOrEqual(1)
  })
})

test("Should get wanted amount", () => {
  expect(getWantedAmount(options, [{ id: "a", users: ["a", "b", "c"] }])).toBe(2)
})

test("Should get unwanted amount", () => {
  expect(getUnwantedAmount(options, [{ id: "a", users: ["a", "b", "c"] }])).toBe(2)
})

test("Should get correct group score", () => {
  expect(getGroupScore(options, { id: "a", users: ["a", "b", "c"] }, "b")).toBe(-2012)
  expect(getGroupScore(options, { id: "a", users: ["a", "b", "c"] }, "a")).toBe(-1982)
  expect(getGroupScore(options, { id: "a", users: ["a", "b", "c"] }, "c")).toBe(-2012)
})

test("Should balance gender", () => {
  expect(balanceGender(options, { id: "a", users: ["a", "b", "c"] }, "female")).toEqual({
    id: "a",
    users: ["a", "b", "c"],
  })
  expect(balanceGender(options, { id: "a", users: ["a", "b", "c"] }, "male")).toEqual({
    id: "a",
    users: ["a", "b"],
  })
})

test("Should get if group wants user", () => {
  expect(groupWantsUser(options, "f", { id: "a", users: ["a", "b", "c"] })).toBe(true)
  expect(getGroupLessWantedUser(options, "f", { id: "a", users: ["a", "b", "c"] })).toBe("b")
  expect(groupWantsUser(options, "d", { id: "a", users: ["a", "b", "c"] })).toBe(true)
  expect(getGroupLessWantedUser(options, "d", { id: "a", users: ["a", "b", "c"] })).toBe("a")
  expect(groupWantsUser(options, "e", { id: "a", users: ["a", "b", "c"] })).toBe(true)
  expect(getGroupLessWantedUser(options, "e", { id: "a", users: ["a", "b", "c"] })).toBe("a")
})

test("Should compare groups by preference", () => {
  expect(
    compareGroupsByPreference(
      { id: "test", wanted: ["a", "b", "c"], unwanted: ["d", "e", "f"], gender: "male" },
      options,
      { id: "testGroup", users: ["a", "b", "d"] },
      { id: "testGroup", users: ["a", "b", "e"] }
    )
  ).toBe(0)
  expect(
    compareGroupsByPreference(
      { id: "test", wanted: ["a", "b", "c"], unwanted: ["d", "e", "f"], gender: "male" },
      options,
      { id: "testGroup", users: ["a", "b", "d"] },
      { id: "testGroup", users: ["a", "b", "c"] }
    )
  ).toBe(1998)
  expect(
    compareGroupsByPreference(
      { id: "test", wanted: ["a", "b", "c"], unwanted: ["d", "e", "f"], gender: "male" },
      options,
      { id: "testGroup", users: ["a", "b", "d"] },
      { id: "testGroup", users: ["a", "e", "d"] }
    )
  ).toBe(-1988)
})

test("Should add unused users", () => {
  expect(
    withUnusedUsers(
      {
        ...options,
        data: [
          { id: "a", unwanted: ["b"], wanted: [], gender: "male" },
          { id: "b", unwanted: [], wanted: [], gender: "female" },
          { id: "c", unwanted: ["d"], wanted: [], gender: "male" },
          { id: "d", unwanted: [], wanted: [], gender: "female" },
        ],
      },
      [
        { id: "a", users: ["a"] },
        { id: "b", users: ["b"] },
      ]
    )
  ).toEqual([
    { id: "a", users: ["a", "c"] },
    { id: "b", users: ["b", "d"] },
  ])

  expect(
    withUnusedUsers(
      {
        ...options,
        data: [
          { id: "a", unwanted: ["b"], wanted: [], gender: "male" },
          { id: "b", unwanted: [], wanted: [], gender: "female" },
          { id: "c", unwanted: ["d"], wanted: [], gender: "male" },
          { id: "d", unwanted: [], wanted: [], gender: "female" },
          { id: "e", unwanted: ["a"], wanted: [], gender: "male" },
          { id: "f", unwanted: [], wanted: [], gender: "female" },
          { id: "g", unwanted: ["c"], wanted: [], gender: "male" },
          { id: "h", unwanted: [], wanted: [], gender: "female" },
        ],
      },
      [
        { id: "a", users: ["a"] },
        { id: "b", users: ["b"] },
      ]
    )
  ).toEqual([
    { id: "b", users: ["b", "d", "e", "g"] },
    { id: "a", users: ["a", "c", "f", "h"] },
  ])
})
