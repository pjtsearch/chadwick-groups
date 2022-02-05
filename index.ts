type UserId = string
type Prefs = { wanted: UserId[]; unwanted: UserId[] }
type Group = UserId[]
type GroupId = string

const GROUP_SIZE = 6

const data: Record<UserId, Prefs> = {
  a: { wanted: ["b", "c", "d"], unwanted: ["e"] },
  b: { wanted: ["a", "e", "d"], unwanted: ["c"] },
  c: { wanted: ["f", "e", "d"], unwanted: ["b"] },
  d: { wanted: ["f", "b", "c"], unwanted: ["a"] },
  e: { wanted: ["c", "b", "a"], unwanted: ["g"] },
  f: { wanted: ["b", "d", "e"], unwanted: ["h"] },
  g: { wanted: ["a", "c", "e"], unwanted: ["b"] },
  h: { wanted: ["e", "d", "f"], unwanted: ["d"] },
  i: { wanted: ["f", "h", "a"], unwanted: ["f"] },
  j: { wanted: ["d", "c", "e"], unwanted: ["b"] },
  k: { wanted: ["b", "j", "c"], unwanted: ["a"] },
  l: { wanted: ["n", "k", "z"], unwanted: ["g"] },
  m: { wanted: ["j", "t", "w"], unwanted: ["z"] },
  n: { wanted: ["q", "k", "i"], unwanted: ["s"] },
  o: { wanted: ["k", "o", "m"], unwanted: ["h"] },
  p: { wanted: ["u", "p", "p"], unwanted: ["m"] },
  q: { wanted: ["x", "w", "y"], unwanted: ["l"] },
  r: { wanted: ["m", "m", "e"], unwanted: ["r"] },
  s: { wanted: ["c", "u", "s"], unwanted: ["i"] },
  t: { wanted: ["p", "l", "m"], unwanted: ["g"] },
  u: { wanted: ["n", "d", "v"], unwanted: ["c"] },
  v: { wanted: ["y", "g", "x"], unwanted: ["a"] },
  w: { wanted: ["p", "f", "g"], unwanted: ["x"] },
  x: { wanted: ["b", "l", "i"], unwanted: ["n"] },
  y: { wanted: ["q", "l", "o"], unwanted: ["k"] },
  z: { wanted: ["t", "n", "q"], unwanted: ["l"] },
}

const isUnwanted = (byPrefs: Prefs) => (user: UserId) => byPrefs.unwanted.includes(user)
const isWanted = (byPrefs: Prefs) => (user: UserId) => byPrefs.wanted.includes(user)

const groupWantsUser = (newUser: UserId, group: Group): Group | undefined =>
  group
    .map((member) => {
      const replaced = [...group.filter((id) => id != member), newUser]
      return {
        replaced,
        rank: group.reduce((score, member) => score + compareGroupsByPreference(data[member], group, replaced), 0),
      }
    })
    .filter(({ rank }) => rank > 0)
    .sort(({ rank }, { rank: otherRank }) => rank - otherRank)
    ?.at(0)?.replaced

const compareGroupsByPreference = (prefs: Prefs, group: Group, otherGroup: Group) =>
  (group.filter(isUnwanted(prefs)).length - otherGroup.filter(isUnwanted(prefs)).length) * 4 +
  (group.filter(isWanted(prefs)).length > 2 ? -2 : 0) +
  (otherGroup.filter(isWanted(prefs)).length > 2 ? 2 : 0) +
  (group.filter(isWanted(prefs)).length > 0 ? 3 : -4) +
  (otherGroup.filter(isWanted(prefs)).length > 0 ? -4 : 3)

const sortGroupsByPreference = (prefs: Prefs, groups: Record<GroupId, Group>) =>
  Object.entries(groups)
    .sort(([_id, group], [_otherId, otherGroup]) => compareGroupsByPreference(prefs, group, otherGroup))
    .map(([id, _data]) => id)

const getGroups = (initial: Record<GroupId, Group>, data: Record<UserId, Prefs>) =>
  Object.entries(data).reduce(
    (groups, [id, prefs]) =>
      sortGroupsByPreference(prefs, groups).reduce((groups, groupId) => {
        if (Object.values(groups).some((group) => group.includes(id))) {
          return groups
        } else if (groups[groupId].length < GROUP_SIZE) {
          return { ...groups, [groupId]: [...groups[groupId], id] }
        } else if (groupWantsUser(id, groups[groupId])) {
          return { ...groups, [groupId]: groupWantsUser(id, groups[groupId])! }
        } else {
          return groups
        }
      }, groups),
    initial
  )

const groups = new Array(100).reduce(
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

console.log(groups)