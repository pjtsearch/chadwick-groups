import flow from "lodash.flow"
import range from "lodash.range"
import shuffle from "lodash.shuffle"
import without from "lodash.without"

export type Gender = "male" | "female"
export type UserId = string
export type Prefs = { wanted: UserId[]; unwanted: UserId[]; gender: Gender }
export type Group = UserId[]
export type GroupId = string

export const GROUP_SIZE = 4

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
const isGender = (gender: Gender, data: Record<UserId, Prefs>) => (user: UserId) => data[user].gender == gender

/**
 * Gets the unused users in a set of groups
 * @param groups The groups to look through
 * @param data The data to get all users with
 * @returns The unused users
 */
const getUnusedUsers = (groups: Record<GroupId, Group>, data: Record<UserId, Prefs>) =>
  Object.keys(data).filter((user) => !Object.values(groups).some((group) => group.includes(user)))

/**
 * Sorts groups by the amount of members
 * @param groups The groups to sort
 * @returns Sorted groups
 */
const sortGroupsByLength = (groups: Record<GroupId, Group>) =>
  Object.entries(groups)
    .sort(([_id, group], [_otherId, otherGroup]) => group.length - otherGroup.length)
    .filter(([_id, g]) => g.length > 0)
    .map(([id]) => id)

/**
 * Gets how many users have people have at least one person they want in their group
 * @param groups The groups to look through
 * @param data The preference data
 * @returns The amount of users that have people have people they want in their group
 */
export const getWantedAmount = (groups: Record<GroupId, Group>, data: Record<UserId, Prefs>) =>
  Object.values(groups).flatMap((group) => group.filter((user) => group.some(isWanted(data[user])))).length

/**
 * Gets how many users have people have at least one person they want in their group
 * @param groups The groups to look through
 * @param data The preference data
 * @returns The amount of users that have people have people they want in their group
 */
export const getUnwantedAmount = (groups: Record<GroupId, Group>, data: Record<UserId, Prefs>) =>
  Object.values(groups).flatMap((group) =>
    group.filter((user) => group.some((otherUser) => data[user].unwanted.includes(otherUser)))
  ).length

// Higher is more wanted
/**
 * Gets how much other users prefer a group without this member compared to one with them,
 * lower means the group prefers the group without this member
 * @param group The group to get prefs from
 * @param member The member to get the score of
 * @param data The preference data
 * @returns How much other users prefer a group without this member compared to one with them
 */
const getGroupScore = (group: Group, member: UserId, data: Record<UserId, Prefs>): number =>
  group.reduce(
    (score, otherMember) => score + compareGroupsByPreference(data[otherMember], without(group, member), group),
    0
  )

/**
 * Gets the group with the correct number of a gender
 * @param group The group to balance
 * @param gender The gender to balance
 * @param data The preference data
 * @returns The group with the correct number of a gender
 */
const balanceGender = (group: Group, gender: Gender, data: Record<UserId, Prefs>): Group => {
  if (group.filter(isGender(gender, data)).length > Math.floor(GROUP_SIZE / 2)) {
    const leastWanted = group
      .filter(isGender(gender, data))
      .sort((member, otherMember) => getGroupScore(group, member, data) - getGroupScore(group, otherMember, data))
    return balanceGender(without(group, leastWanted[0]), gender, data)
  }
  return group
}

/**
 * Gets the group with the new user replacing another user if the other user is less wanted
 * @param newUser The new user
 * @param group The group to check
 * @param data The preference data
 * @returns The group with the new user added if they should be, or undefined
 */
const groupWantsUser = (newUser: UserId, group: Group, data: Record<UserId, Prefs>): boolean =>
  group
    .map((member) => {
      const replaced = [...without(group, member), newUser]
      return {
        replaced,
        rank: group.reduce((score, member) => score + compareGroupsByPreference(data[member], replaced, group), 0),
      }
    })
    .some(({ rank }) => rank < 0)

const groupLessWantedUser = (newUser: UserId, group: Group, data: Record<UserId, Prefs>): UserId | undefined =>
  group
    .map((member) => {
      const replaced = [...without(group, member), newUser]
      return {
        member,
        rank: group.reduce((score, member) => score + compareGroupsByPreference(data[member], replaced, group), 0),
      }
    })
    .filter(({ rank }) => rank < 0)
    .sort(({ rank }, { rank: otherRank }) => rank - otherRank)
    ?.at(0)?.member

/**
 * Compares group to be sorted from most to least liked
 * @param prefs The prefs to use
 * @param group A group
 * @param otherGroup A group to compare with
 * @returns A negative if the first group is more preferred, 0 if equal,
 * or positive if other group is preferred
 */
const compareGroupsByPreference = (prefs: Prefs, group: Group, otherGroup: Group) =>
  (group.filter(isUnwanted(prefs)).length - otherGroup.filter(isUnwanted(prefs)).length) * 2000 +
  (group.filter(isWanted(prefs)).length > 2 ? 2 : 0) +
  (otherGroup.filter(isWanted(prefs)).length > 2 ? -2 : 0) +
  (group.filter(isWanted(prefs)).length > 0 ? -3 : 3) +
  (otherGroup.filter(isWanted(prefs)).length > 0 ? 3 : -3) +
  (group.filter(isWanted(prefs)).length == 1 ? -6 : 6) +
  (otherGroup.filter(isWanted(prefs)).length == 1 ? 6 : -6)

/**
 * Sorts groups by preference
 * @param prefs The preference to sort by
 * @param groups The groups to sort
 * @returns The sorted ids of the groups
 */
const sortGroupsByPreference = (prefs: Prefs, groups: Record<GroupId, Group>) =>
  Object.entries(groups)
    .sort(([_id, group], [_otherId, otherGroup]) => compareGroupsByPreference(prefs, group, otherGroup))
    .map(([id, _data]) => id)

/**
 * Gets the desired groups
 * @param initial The initial groups
 * @param data The preference data
 * @returns Groups with all users
 */
const getGroups = (initial: Record<GroupId, Group>, data: Record<UserId, Prefs>) =>
  flow(
    Object.entries,
    shuffle,
    (shuffled: [UserId, Prefs][]) =>
      shuffled.reduce(
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
                [groupId]: balanceGender(
                  [...without(groups[groupId], groupLessWantedUser(id, groups[groupId], data)!), id],
                  data[id].gender,
                  data
                ),
              }
            } else {
              return groups
            }
          }, groups),
        initial
      ),
    withUnusedUsers(data)
  )(data)
  // withUnusedUsers(
  //   shuffle(Object.entries(data)).reduce(
  //     (groups, [id, prefs]) =>
  //       sortGroupsByPreference(prefs, groups).reduce((groups, groupId) => {
  //         if (Object.values(groups).some((group) => group.includes(id))) {
  //           return groups
  //         } else if (
  //           groups[groupId].length < GROUP_SIZE &&
  //           groups[groupId].every((member) => !data[member].unwanted.includes(id))
  //         ) {
  //           return { ...groups, [groupId]: balanceGender([...groups[groupId], id], data[id].gender, data) }
  //         } else if (groupWantsUser(id, groups[groupId], data)) {
  //           return {
  //             ...groups,
  //             [groupId]: balanceGender(
  //               [...without(groups[groupId], groupLessWantedUser(id, groups[groupId], data)!), id],
  //               data[id].gender,
  //               data
  //             ),
  //           }
  //         } else {
  //           return groups
  //         }
  //       }, groups),
  //     initial
  //   ),
  //   data
  // )

/**
 * Adds unused users by first adding without any conflicts, then disregarding gender size,
 * then disregarding group size
 * @param initial The initial groups
 * @param data The preference data
 * @returns The group with unused users added
 */
const withUnusedUsers = (data: Record<UserId, Prefs>) => (initial: Record<GroupId, Group>): Record<GroupId, Group> => {
  const addUsersWithConstraints =
    (constraints: (group: Group, userId: UserId) => boolean) => (initial: Record<GroupId, Group>) =>
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

  return flow(
    // Without conflict
    addUsersWithConstraints(
      (group, userId) =>
        group.length < GROUP_SIZE &&
        group.every((member) => !data[member].unwanted.includes(userId)) &&
        group.every((member) => !data[userId].unwanted.includes(member)) &&
        group.filter(isGender(data[userId].gender, data)).length < Math.floor(GROUP_SIZE / 2)
    ),
    // With gender conflict
    addUsersWithConstraints(
      (group, userId) =>
        group.length < GROUP_SIZE &&
        group.every((member) => !data[member].unwanted.includes(userId)) &&
        group.every((member) => !data[userId].unwanted.includes(member))
    ),
    // With length conflict
    addUsersWithConstraints(
      (group, userId) =>
        group.every((member) => !data[member].unwanted.includes(userId)) &&
        group.every((member) => !data[userId].unwanted.includes(member))
    ),
    // Wanted conflict
    addUsersWithConstraints((group, userId) => group.every((member) => !data[userId].unwanted.includes(member))),
    addUsersWithConstraints((_group, _userId) => true)
  )(initial)
}

/**
 * Tries multiple iterations to find groups with the most people having at least one wanted
 * @param iterations The amount of iterations
 * @param data The preference data
 * @param initial The initial groups
 * @returns The groups with the most wanted
 */
export const getGroupsIterations = (
  iterations: number,
  data: Record<UserId, Prefs>,
  initial: Record<GroupId, Group> = {
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
  range(iterations).reduce((prev) => {
    const curr = getGroups(initial, data)

    // Only add unwanted to groups on later loops

    // console.log(Object.values(curr).map((g) => g.map((u) => [u, data[u].gender])))
    return getUnwantedAmount(curr, data) <= getUnwantedAmount(prev, data) &&
      getWantedAmount(curr, data) > getWantedAmount(prev, data)
      ? curr
      : prev
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
