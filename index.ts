export type Gender = "male" | "female"
export type UserId = string
export type Prefs = { wanted: UserId[]; unwanted: UserId[]; gender: Gender }
export type Group = UserId[]
export type GroupId = string

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

const isUnwanted = (byPrefs: Prefs) => (user: UserId) => byPrefs.unwanted.includes(user)
const isWanted = (byPrefs: Prefs) => (user: UserId) => byPrefs.wanted.includes(user)
const isGender = (gender: Gender, data: Record<string, Prefs>) => (user: UserId) => data[user].gender == gender

const getUnusedUsers = (groups: Record<GroupId, Group>, data: Record<UserId, Prefs>) =>
  Object.keys(data).filter((user) => !Object.values(groups).some((group) => group.includes(user)))

export const getWantedAmount = (groups: Record<string, Group>, data: Record<string, Prefs>) =>
  Object.values(groups).flatMap((group) => group.filter((user) => group.some(isWanted(data[user])))).length

// Higher is more wanted
const getGroupScore = (group: Group, member: UserId, data: Record<string, Prefs>): number =>
  group.reduce(
    (score, otherMember) =>
      score +
      compareGroupsByPreference(
        data[otherMember],
        group.filter((u) => u != member),
        group
      ),
    0
  )

const balanceGender = (group: Group, gender: Gender, data: Record<string, Prefs>): Group => {
  let curr = group
  while (curr.filter(isGender(gender, data)).length > Math.floor(GROUP_SIZE / 2)) {
    const leastWanted = curr
      .filter(isGender(gender, data))
      .sort((member, otherMember) => getGroupScore(group, member, data) - getGroupScore(group, otherMember, data))
    curr = curr.filter((u) => u !== leastWanted[0])
  }
  return curr
}

const groupWantsUser = (newUser: UserId, group: Group, data: Record<string, Prefs>): Group | undefined =>
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

// Less is more wanted
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
  withUnusedUsers(
    Object.entries(data).reduce((groups, [id, prefs]) => {
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
          return { ...groups, [groupId]: balanceGender([...groups[groupId], id], data[id].gender, data) }
        } else if (groupWantsUser(id, groups[groupId], data)) {
          return {
            ...groups,
            [groupId]: balanceGender(groupWantsUser(id, groups[groupId], data)!, data[id].gender, data),
          }
        } else {
          return groups
        }
      }, init)
    }, initial),
    data
  )

const withUnusedUsers = (initial: Record<GroupId, Group>, data: Record<UserId, Prefs>): Record<GroupId, Group> => {
  const groupsWithoutConflict = getUnusedUsers(initial, data).reduce((groups, userId) => {
    const sortedGroups = Object.entries(groups)
      .sort(([_id, group], [_otherId, otherGroup]) => group.length - otherGroup.length)
      .filter(([_id, g]) => g.length > 0)
      .map(([id]) => id)
    return sortedGroups.reduce((groups, groupId) => {
      if (Object.values(groups).flat().includes(userId)) {
        return groups
      } else if (
        groups[groupId].length < GROUP_SIZE &&
        groups[groupId].every((member) => !data[member].unwanted.includes(userId)) &&
        groups[groupId].every((member) => !data[userId].unwanted.includes(member)) &&
        groups[groupId].filter(isGender(data[userId].gender, data)).length < Math.floor(GROUP_SIZE / 2)
      ) {
        return { ...groups, [groupId]: [...groups[groupId], userId] }
      } else {
        return groups
      }
    }, groups)
  }, initial)
  const groupsWithGenderConflict = getUnusedUsers(groupsWithoutConflict, data).reduce((groups, userId) => {
    const sortedGroups = Object.entries(groups)
      .sort(([_id, group], [_otherId, otherGroup]) => group.length - otherGroup.length)
      .filter(([_id, g]) => g.length > 0)
      .map(([id]) => id)
    return sortedGroups.reduce((groups, groupId) => {
      if (Object.values(groups).flat().includes(userId)) {
        return groups
      } else if (
        groups[groupId].length < GROUP_SIZE &&
        groups[groupId].every((member) => !data[member].unwanted.includes(userId)) &&
        groups[groupId].every((member) => !data[userId].unwanted.includes(member))
      ) {
        return { ...groups, [groupId]: [...groups[groupId], userId] }
      } else {
        return groups
      }
    }, groups)
  }, groupsWithoutConflict)
  const groupsWithLengthConflict = getUnusedUsers(groupsWithoutConflict, data).reduce((groups, userId) => {
    const sortedGroups = Object.entries(groups)
      .sort(([_id, group], [_otherId, otherGroup]) => group.length - otherGroup.length)
      .filter(([_id, g]) => g.length > 0)
      .map(([id]) => id)
    return sortedGroups.reduce((groups, groupId) => {
      if (Object.values(groups).flat().includes(userId)) {
        return groups
      } else if (
        groups[groupId].every((member) => !data[member].unwanted.includes(userId)) &&
        groups[groupId].every((member) => !data[userId].unwanted.includes(member))
      ) {
        return { ...groups, [groupId]: [...groups[groupId], userId] }
      } else {
        return groups
      }
    }, groups)
  }, groupsWithoutConflict)
  console.log({
    initial,
    groupsWithoutConflict,
    groupsWithGenderConflict,
    groupsWithLengthConflict,
    sortedGroups: Object.entries(initial)
      .sort(([_id, group], [_otherId, otherGroup]) => group.length - otherGroup.length)
      .filter(([_id, g]) => g.length > 0)
      .map(([id]) => id),
  })
  return groupsWithLengthConflict
}

export const getGroupsIterations = (
  iterations: number,
  data: Record<string, Prefs>,
  initial: Record<string, Group> = {
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
  }
) =>
  new Array<null>(iterations).fill(null).reduce((prev) => {
    const curr = getGroups(initial, data)
    return getWantedAmount(curr, data) > getWantedAmount(prev, data) ? curr : prev
  }, initial)

// if (
//   Object.values(groups).some((group) =>
//     group.some((user) => group.some((otherUser) => data[user].unwanted.includes(otherUser)))
//   )
// ) {
//   console.error("Has unwanted")
// }

// console.log(
//   Object.values(groups).flatMap((group) =>
//     group.filter((user) => group.some((otherUser) => data[user].wanted.includes(otherUser)))
//   ).length
// )

// if (
//   Object.values(groups).flatMap((group) =>
//     group.filter((user) => group.some((otherUser) => data[user].wanted.includes(otherUser)))
//   ).length <=
//   Object.keys(data).length / 2
// ) {
//   console.error("Not enough wanted")
// }

// console.log(getGroupsIterations(1000, data))
