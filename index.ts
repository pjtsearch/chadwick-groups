type UserId = string
type Prefs = { wanted: UserId[]; unwanted: UserId[] }
type Group = UserId[]
type GroupId = string

const GROUP_SIZE = 4

function shuffle<T>(array: T[]) {
  let currentIndex = array.length,
    randomIndex

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--

    // And swap it with the current element.
    ;[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
  }

  return array
}

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

const isUnwanted = (byPrefs: Prefs) => (user: UserId) => byPrefs.unwanted.includes(user)
const isWanted = (byPrefs: Prefs) => (user: UserId) => byPrefs.wanted.includes(user)

const groupWantsUser = (newUser: UserId, group: Group): Group | undefined =>
  group
    .map((member) => {
      const replaced = [...group.filter((id) => id != member), newUser]
      return {
        replaced,
        rank: group.reduce((score, member) => score + compareGroupsByPreference(data[member], replaced, group), 0),
      }
    })
    .filter(({ rank }) => rank < 0)
    .sort(({ rank }, { rank: otherRank }) => rank - otherRank)
    ?.at(0)?.replaced

const compareGroupsByPreference = (prefs: Prefs, group: Group, otherGroup: Group) =>
  (group.filter(isUnwanted(prefs)).length - otherGroup.filter(isUnwanted(prefs)).length) * 2000 +
  (group.filter(isWanted(prefs)).length > 2 ? 2 : 0) +
  (otherGroup.filter(isWanted(prefs)).length > 2 ? -2 : 0) +
  (group.filter(isWanted(prefs)).length > 0 ? -3 : 3) +
  (otherGroup.filter(isWanted(prefs)).length > 0 ? 3 : -3) +
  (group.filter(isWanted(prefs)).length == 1 ? -6 : 6) +
  (otherGroup.filter(isWanted(prefs)).length == 1 ? 6 : -6)

const sortGroupsByPreference = (prefs: Prefs, groups: Record<GroupId, Group>) =>
  Object.entries(groups)
    .sort(([_id, group], [_otherId, otherGroup]) => compareGroupsByPreference(prefs, group, otherGroup))
    .map(([id, _data]) => id)

const getGroups = (initial: Record<GroupId, Group>, data: Record<UserId, Prefs>) =>
  shuffle(Object.entries(data)).reduce((groups, [id, prefs]) => {
    // console.log({
    //   id,
    //   pr: sortGroupsByPreference(prefs, groups),
    //   groups,
    //   u: compareGroupsByPreference(prefs, groups["1"], groups["2"]),
    // }),

    // const inGroup = Object.entries(groups).find(([_groupId, group]) => group.includes(id))?.[0]
    // const init = inGroup ? { ...groups, [inGroup]: groups[inGroup].filter((member) => member != id) } : groups
    const init = groups
    return sortGroupsByPreference(prefs, init).reduce((groups, groupId) => {
      if (Object.values(groups).some((group) => group.includes(id))) {
        return groups
      } else if (
        groups[groupId].length < GROUP_SIZE &&
        groups[groupId].every((member) => !data[member].unwanted.includes(id))
      ) {
        return { ...groups, [groupId]: [...groups[groupId], id] }
      } else if (groupWantsUser(id, groups[groupId])) {
        return { ...groups, [groupId]: groupWantsUser(id, groups[groupId])! }
      } else {
        return groups
      }
    }, init)
  }, initial)

const groups = new Array<never>(1000).reduce(
  (groups) =>
    Object.keys(data).every((user) => Object.values(groups).flat().includes(user)) ? getGroups(groups, data) : groups,
  getGroups(
    {
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
    data
  )
)

if (
  Object.values(groups).some((group) =>
    group.some((user) => group.some((otherUser) => data[user].unwanted.includes(otherUser)))
  )
) {
  console.error("Has unwanted")
}

console.log(
  Object.values(groups).flatMap((group) =>
    group.filter((user) => group.some((otherUser) => data[user].wanted.includes(otherUser)))
  ).length
)

if (
  Object.values(groups).flatMap((group) =>
    group.filter((user) => group.some((otherUser) => data[user].wanted.includes(otherUser)))
  ).length <=
  Object.keys(data).length / 2
) {
  console.error("Not enough wanted")
}

console.log(groups)