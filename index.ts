export type Gender = "male" | "female"
export type UserId = string
export type Prefs = { wanted: UserId[]; unwanted: UserId[]; gender: Gender }
export type Group = UserId[]
export type GroupId = string

const GROUP_SIZE = 4

/**
 * Randomizes the order of an array
 * @param array The array to randomize
 * @returns The randomized array
 */
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

/**
 * Returns function that finds if another user is unwanted by certain prefs
 * @param byPrefs The prefs to determine by
 * @returns A function that returns whether another user is unwanted
 */
const isUnwanted = (byPrefs: Prefs) => (user: UserId) => byPrefs.unwanted.includes(user)

/**
 * Returns function that finds if another user is wanted by certain prefs
 * @param byPrefs The prefs to determine by
 * @returns A function that returns whether another user is wanted
 */
const isWanted = (byPrefs: Prefs) => (user: UserId) => byPrefs.wanted.includes(user)

/**
 * Returns function that finds if a user is of a certain gender
 * @param gender The gender to determine by
 * @param data The data to find genders with
 * @returns A function that returns whether a user is of a certain gender
 */
const isGender = (gender: Gender, data: Record<string, Prefs>) => (user: UserId) => data[user].gender == gender

/**
 * Gets the unused users in a set of groups
 * @param groups The groups to look through
 * @param data The data to get all users with
 * @returns The unused users
 */
const getUnusedUsers = (groups: Record<GroupId, Group>, data: Record<UserId, Prefs>) =>
  Object.keys(data).filter((user) => !Object.values(groups).some((group) => group.includes(user)))

const sortGroupsByLength = (groups: Record<GroupId, Group>) =>
  Object.entries(groups)
    .sort(([_id, group], [_otherId, otherGroup]) => group.length - otherGroup.length)
    .filter(([_id, g]) => g.length > 0)
    .map(([id]) => id)

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
    shuffle(Object.entries(data)).reduce(
      (groups, [id, prefs]) =>
        sortGroupsByPreference(prefs, groups).reduce((groups, groupId) => {
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
        }, groups),
      initial
    ),
    data
  )

const withUnusedUsers = (initial: Record<GroupId, Group>, data: Record<UserId, Prefs>): Record<GroupId, Group> => {
  const addUsersWithConstraints = (
    initial: Record<GroupId, Group>,
    constraints: (group: Group, userId: UserId) => boolean
  ) =>
    getUnusedUsers(initial, data).reduce(
      (groups, userId) =>
        sortGroupsByLength(groups).reduce((groups, groupId) => {
          if (Object.values(groups).flat().includes(userId)) {
            return groups
          } else if (constraints(groups[groupId], userId)) {
            return { ...groups, [groupId]: [...groups[groupId], userId] }
          } else {
            return groups
          }
        }, groups),
      initial
    )

  const groupsWithoutConflict = addUsersWithConstraints(
    initial,
    (group, userId) =>
      group.length < GROUP_SIZE &&
      group.every((member) => !data[member].unwanted.includes(userId)) &&
      group.every((member) => !data[userId].unwanted.includes(member)) &&
      group.filter(isGender(data[userId].gender, data)).length < Math.floor(GROUP_SIZE / 2)
  )
  const groupsWithGenderConflict = addUsersWithConstraints(
    groupsWithoutConflict,
    (group, userId) =>
      group.length < GROUP_SIZE &&
      group.every((member) => !data[member].unwanted.includes(userId)) &&
      group.every((member) => !data[userId].unwanted.includes(member))
  )
  const groupsWithLengthConflict = addUsersWithConstraints(
    groupsWithGenderConflict,
    (group, userId) =>
      group.every((member) => !data[member].unwanted.includes(userId)) &&
      group.every((member) => !data[userId].unwanted.includes(member))
  )
  // TODO: Readd when change tests
  // const groupsWithWantedConflict = addUsersWithConstraints(groupsWithLengthConflict, (group, userId) =>
  //   group.every((member) => !data[userId].unwanted.includes(member))
  // )
  // const groupsWithSelfWantedConflict = addUsersWithConstraints(groupsWithWantedConflict, (_group, _userId) => true)
  // console.log({
  //   initial,
  //   groupsWithoutConflict,
  //   groupsWithGenderConflict,
  //   groupsWithLengthConflict,
  //   sortedGroups: Object.entries(initial)
  //     .sort(([_id, group], [_otherId, otherGroup]) => group.length - otherGroup.length)
  //     .filter(([_id, g]) => g.length > 0)
  //     .map(([id]) => id),
  // })
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
  [...new Array(iterations).keys()].reduce((prev) => {
    const curr = getGroups(initial, data)

    // Only add unwanted to groups on later loops

    // console.log(Object.values(curr).map((g) => g.map((u) => [u, data[u].gender])))
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
