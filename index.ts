type UserId = string
type Prefs = { wanted: UserId[]; unwanted: UserId[] }
type Group = UserId[]

const GROUP_SIZE = 2

const data: Record<UserId, Prefs> = {
  a: { wanted: ["b", "c", "d"], unwanted: ["e"] },
  b: { wanted: ["a", "e", "d"], unwanted: ["c"] },
  c: { wanted: ["f", "e", "d"], unwanted: ["b"] },
  d: { wanted: ["a", "b", "d"], unwanted: ["a"] },
  e: { wanted: ["c", "b", "a"], unwanted: ["g"] },
  f: { wanted: ["b", "d", "e"], unwanted: ["h"] },
  g: { wanted: ["a", "c", "e"], unwanted: ["b"] },
  h: { wanted: ["e", "d", "f"], unwanted: ["d"] },
  i: { wanted: ["f", "h", "a"], unwanted: ["f"] },
  j: { wanted: ["d", "c", "e"], unwanted: ["b"] },
}

const isUnwanted = (byPrefs: Prefs) => (user: UserId) => byPrefs.unwanted.includes(user)
const isWanted = (byPrefs: Prefs) => (user: UserId) => byPrefs.wanted.includes(user)

const sortGroupsByPreference = (prefs: Prefs, groups: Group[]) =>
  groups.sort(
    (group, otherGroup) =>
      (group.filter(isUnwanted(prefs)).length - otherGroup.filter(isUnwanted(prefs)).length) * 3 +
      (group.filter(isWanted(prefs)).length > 2 ? -2 : 0) +
      (otherGroup.filter(isWanted(prefs)).length > 2 ? 2 : 0) +
      (group.filter(isWanted(prefs)).length > 0 ? 1 : -1) +
      (otherGroup.filter(isWanted(prefs)).length > 0 ? -1 : 1)
  )

Object.entries(data).reduce((groups, [id, prefs], i, all) => {
  const groupsByPreference = sortGroupsByPreference(prefs, groups)
  console.log({ id, groupsByPreference })
  return groups
}, new Array<Group>(3).fill([]))
