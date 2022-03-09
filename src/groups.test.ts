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
  getGroupSetScore,
  getUnusedUsers,
  getStatistics,
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
    expect(res).toBeLessThanOrEqual(2)
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
  expect(getGroupScore(options, { id: "a", users: ["d", "h", "l"] }, "d")).toBe(-1982)
  expect(getGroupScore(options, { id: "a", users: ["d", "h", "l"] }, "h")).toBe(0)
  expect(getGroupScore(options, { id: "a", users: ["d", "h", "l"] }, "l")).toBe(0)
  expect(getGroupScore(options, { id: "a", users: ["d", "j", "l"] }, "d")).toBe(18)
  expect(getGroupScore(options, { id: "a", users: ["d", "j", "l"] }, "l")).toBe(0)
  expect(getGroupScore(options, { id: "a", users: ["d", "j", "l"] }, "j")).toBe(0)
})

test("Should get correct group set score", () => {
  expect(
    getGroupSetScore(
      options,
      [
        { id: "a", users: ["a", "b", "c"] },
        { id: "b", users: ["n", "e", "d"] },
        { id: "c", users: ["j", "m", "k"] },
      ],
      [{ id: "a", users: ["a", "b", "c"] }]
    )
  ).toBe(320)
  expect(
    getGroupSetScore(
      options,
      [{ id: "a", users: ["a", "b", "c"] }],
      [{ id: "a", users: ["a", "b", "c"] }]
    )
  ).toBe(320)
  expect(getGroupSetScore(options, [{ id: "a", users: ["a"] }], [])).toBe(-5680)
  expect(
    getGroupSetScore(
      options,
      [
        { id: "a", users: ["a", "b", "c"] },
        { id: "b", users: ["n", "e", "d"] },
        { id: "c", users: ["j", "m", "k"] },
      ],
      [{ id: "a", users: [] }]
    )
  ).toBe(-3800)
  expect(
    getGroupSetScore(
      options,
      [{ id: "a", users: [] }],
      [
        { id: "a", users: ["a", "b", "c"] },
        { id: "b", users: ["n", "e", "d"] },
        { id: "c", users: ["j", "m", "k"] },
      ]
    )
  ).toBe(3800)
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
  expect(balanceGender(options, { id: "a", users: ["v", "b", "c", "d", "z"] }, "male")).toEqual({
    id: "a",
    users: ["v", "b", "d", "z"],
  })
  expect(balanceGender(options, { id: "a", users: ["v", "b", "c", "d", "z"] }, "female")).toEqual({
    id: "a",
    users: ["v", "b", "c", "d", "z"],
  })
  expect(balanceGender(options, { id: "a", users: [] }, "female")).toEqual({
    id: "a",
    users: [],
  })
})

test("Should get if group wants user", () => {
  expect(groupWantsUser(options, "f", { id: "a", users: ["a", "b", "c"] })).toBe(true)
  expect(getGroupLessWantedUser(options, "f", { id: "a", users: ["a", "b", "c"] })).toBe("b")
  expect(groupWantsUser(options, "d", { id: "a", users: ["a", "b", "c"] })).toBe(true)
  expect(getGroupLessWantedUser(options, "d", { id: "a", users: ["a", "b", "c"] })).toBe("a")
  expect(groupWantsUser(options, "e", { id: "a", users: ["a", "b", "c"] })).toBe(true)
  expect(getGroupLessWantedUser(options, "e", { id: "a", users: ["a", "b", "c"] })).toBe("a")
  expect(groupWantsUser(options, "e", { id: "a", users: ["a", "b", "d"] })).toBe(true)
  expect(getGroupLessWantedUser(options, "e", { id: "a", users: ["a", "b", "d"] })).toBe("a")
  expect(groupWantsUser(options, "e", { id: "a", users: ["a", "b", "h"] })).toBe(true)
  expect(getGroupLessWantedUser(options, "e", { id: "a", users: ["a", "b", "h"] })).toBe("a")
  expect(groupWantsUser(options, "g", { id: "a", users: ["d", "l", "j"] })).toBe(false)
  expect(getGroupLessWantedUser(options, "g", { id: "a", users: ["d", "l", "j"] })).toBeUndefined()
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
  expect(
    compareGroupsByPreference(
      { id: "test", wanted: [], unwanted: ["a", "b", "c", "d", "e", "f"], gender: "male" },
      options,
      { id: "testGroup", users: ["a", "b", "d"] },
      { id: "testGroup", users: ["a", "e", "d"] }
    )
  ).toBe(0)
  expect(
    compareGroupsByPreference(
      { id: "test", wanted: ["a", "b", "c", "d", "e", "f"], unwanted: [], gender: "male" },
      options,
      { id: "testGroup", users: ["a", "b", "d"] },
      { id: "testGroup", users: ["a", "e", "d"] }
    )
  ).toBe(0)
  expect(
    compareGroupsByPreference(
      { id: "test", wanted: [], unwanted: [], gender: "male" },
      options,
      { id: "testGroup", users: ["a", "b", "d"] },
      { id: "testGroup", users: ["a", "e", "d"] }
    )
  ).toBe(0)
  expect(
    compareGroupsByPreference(
      { id: "test", wanted: ["a"], unwanted: [], gender: "male" },
      options,
      { id: "testGroup", users: ["a", "b", "d"] },
      { id: "testGroup", users: [] }
    )
  ).toBe(-18)
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
    { id: "b", users: ["b", "d"] },
    { id: "a", users: ["a", "c"] },
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
    { id: "a", users: ["a", "c", "f", "h"] },
    { id: "b", users: ["b", "d", "e", "g"] },
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
        ],
      },
      [{ id: "a", users: ["a"] }]
    )
  ).toEqual([{ id: "a", users: ["a", "c", "b", "d"] }])

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
      [{ id: "a", users: [] }]
    )
  ).toEqual([{ id: "a", users: [] }])
})

test("Should get unused users", () => {
  expect(
    getUnusedUsers(
      [
        { id: "a", users: ["a"] },
        { id: "b", users: ["b"] },
      ],
      [
        { id: "a", unwanted: ["b"], wanted: [], gender: "male" },
        { id: "b", unwanted: [], wanted: [], gender: "female" },
        { id: "c", unwanted: ["d"], wanted: [], gender: "male" },
        { id: "d", unwanted: [], wanted: [], gender: "female" },
      ]
    )
  ).toEqual([
    { id: "c", unwanted: ["d"], wanted: [], gender: "male" },
    { id: "d", unwanted: [], wanted: [], gender: "female" },
  ])

  expect(
    getUnusedUsers(
      [],
      [
        { id: "a", unwanted: ["b"], wanted: [], gender: "male" },
        { id: "b", unwanted: [], wanted: [], gender: "female" },
        { id: "c", unwanted: ["d"], wanted: [], gender: "male" },
        { id: "d", unwanted: [], wanted: [], gender: "female" },
      ]
    )
  ).toEqual([
    { id: "a", unwanted: ["b"], wanted: [], gender: "male" },
    { id: "b", unwanted: [], wanted: [], gender: "female" },
    { id: "c", unwanted: ["d"], wanted: [], gender: "male" },
    { id: "d", unwanted: [], wanted: [], gender: "female" },
  ])
})

test("Should get statistics", () => {
  expect(
    getStatistics(
      [
        { id: "6", users: ["n", "h", "e", "q", "y"] },
        { id: "3", users: ["m", "r", "b", "i"] },
        { id: "4", users: ["v", "u", "d", "f"] },
        { id: "1", users: ["a", "z", "x", "g"] },
        { id: "5", users: ["t", "c", "p", "j"] },
        { id: "2", users: ["o", "s", "l", "k", "w"] },
      ],
      options
    )
  ).toEqual({
    unusedUsers: [],
    unwantedAmount: 0,
    wantedAmount: 25,
    avgWantedPerUser: 1.3076923076923077,
    usersWithNoWanted: 1,
  })
  expect(
    getStatistics(
      [
        { id: "1", users: ["c", "l", "w", "m"] },
        { id: "2", users: ["b", "e", "y", "k", "n"] },
        { id: "3", users: ["a", "v", "g"] },
      ],
      options
    )
  ).toEqual({
    unusedUsers: ["d", "f", "h", "i", "j", "o", "p", "q", "r", "s", "t", "u", "x", "z"],
    unwantedAmount: 5,
    wantedAmount: 8,
    avgWantedPerUser: 0.75,
    usersWithNoWanted: 4,
  })
})
