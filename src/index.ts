import flow from "lodash.flow"
import range from "lodash.range"
import shuffle from "lodash.shuffle"
import without from "lodash.without"

/**
 * Type for gender
 */
export type Gender = "male" | "female"

/**
 * Type for user id
 */
export type UserId = string

/**
 * Type for user data
 */
export type Prefs = { 
  /**
   * Users that are wanted to be in a group with
   */
  wanted: UserId[];
  /**
   * Users that are not wanted to be in a group with
   */
  unwanted: UserId[];
  /**
   * The gender of the user
   */
  gender: Gender
}

/**
 * Type for a group of users
 */
export type Group = UserId[]

/**
 * Type for the id of a group
 */
export type GroupId = string

/**
 * Options for group creating
 */
export type Options = {
  groupSize: number,
  initial: Record<GroupId, Group>,
  data: Record<UserId, Prefs>
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
const isGender = (gender: Gender, {data}: Options) => (user: UserId) => data[user].gender == gender

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
export const getWantedAmount = (groups: Record<GroupId, Group>, {data}: Options) =>
  Object.values(groups).flatMap((group) => group.filter((user) => group.some(isWanted(data[user])))).length

/**
 * Gets how many users have people have at least one person they want in their group
 * @param groups The groups to look through
 * @param data The preference data
 * @returns The amount of users that have people have people they want in their group
 */
export const getUnwantedAmount = (groups: Record<GroupId, Group>, {data}: Options) =>
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
export const getGroupScore = (group: Group, member: UserId, {data}: Options): number =>
  without(group, member).reduce(
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
export const balanceGender = (group: Group, gender: Gender, options: Options): Group => {
  if (group.filter(isGender(gender, options)).length > Math.floor(options.groupSize / 2)) {
    const leastWanted = group
      .filter(isGender(gender, options))
      .sort((member, otherMember) => getGroupScore(group, member, options) - getGroupScore(group, otherMember, options))
    return balanceGender(without(group, leastWanted[0]), gender, options)
  }
  return group
}

/**
 * Gets if a new user is wanted more than any other user
 * @param newUser The new user
 * @param group The group to check
 * @param data The preference data
 * @returns If a new user is wanted more than any other user
 */
export const groupWantsUser = (newUser: UserId, group: Group, {data}: Options): boolean =>
  group
    .map((member) => {
      const replaced = [...without(group, member), newUser]
      return group.reduce((score, member) => score + compareGroupsByPreference(data[member], replaced, group), 0)
    })
    .some((rank) => rank < 0)


/**
 * Gets the user who is less wanted than a new user or undefined if there isn't one
 * @param newUser The new user
 * @param group The group to check
 * @param data The preference data
 * @returns The user who is less wanted than a new user or undefined if there isn't one
 */
export const groupLessWantedUser = (newUser: UserId, group: Group, {data}: Options): UserId | undefined =>
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
export const compareGroupsByPreference = (prefs: Prefs, group: Group, otherGroup: Group) =>
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
 * 
 * - Randomizes the users
 * - Reduces the randomized users to groups starting with the initial groups:
 *     - In each user, return the current groups sorted by their preference (most preferred to least preferred), reduced by 
 *         - In each group:
 *             - Return the old groups if the user is already in a group
 *             - Add the user to the group if it is below size and the user isn't unwanted by others, then balance gender
 *             - Add the user to the group if they are more liked than another member ({@link groupWantsUser}),
 *               then balance gender
 *             - Otherwise, return the old groups
 * - Adds the unused users ({@link withUnusedUsers})
 * 
 * @param initial The initial groups
 * @param data The preference data
 * @returns Groups with all users
 */
const getGroups = (initial: Record<GroupId, Group>, options: Options) =>
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
              groups[groupId].length < options.groupSize &&
              groups[groupId].every((member) => !options.data[member].unwanted.includes(id))
            ) {
              return { ...groups, [groupId]: balanceGender([...groups[groupId], id], options.data[id].gender, options) }
            } else if (groupWantsUser(id, groups[groupId], options)) {
              return {
                ...groups,
                [groupId]: balanceGender(
                  [...without(groups[groupId], groupLessWantedUser(id, groups[groupId], options)!), id],
                  options.data[id].gender,
                  options
                ),
              }
            } else {
              return groups
            }
          }, groups),
        initial
      ),
    withUnusedUsers(options)
  )(options.data)

/**
 * Adds unused users
 * 
 * 1. Adds unused users to groups sorted by length if there are no unwanted, gender, or size conflicts
 * 2. Adds unused users to groups sorted by length if there are no unwanted or size conflicts
 * 3. Adds unused users to groups sorted by length if there are no unwanted conflicts
 * 4. Adds unused users to groups sorted by length if there are no unwanted conflicts from other users
 * 5. Adds remaining unused users
 * 
 * @param initial The initial groups
 * @param data The preference data
 * @returns The group with unused users added
 */
export const withUnusedUsers =
  (options: Options) =>
  (initial: Record<GroupId, Group>): Record<GroupId, Group> => {
    const addUsersWithConstraints =
      (constraints: (group: Group, userId: UserId) => boolean) => (initial: Record<GroupId, Group>) =>
        getUnusedUsers(initial, options.data).reduce(
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
          group.length < options.groupSize &&
          group.every((member) => !options.data[member].unwanted.includes(userId)) &&
          group.every((member) => !options.data[userId].unwanted.includes(member)) &&
          group.filter(isGender(options.data[userId].gender, options)).length < Math.floor(options.groupSize / 2)
      ),
      // With gender conflict
      addUsersWithConstraints(
        (group, userId) =>
          group.length < options.groupSize &&
          group.every((member) => !options.data[member].unwanted.includes(userId)) &&
          group.every((member) => !options.data[userId].unwanted.includes(member))
      ),
      // With length conflict
      addUsersWithConstraints(
        (group, userId) =>
          group.every((member) => !options.data[member].unwanted.includes(userId)) &&
          group.every((member) => !options.data[userId].unwanted.includes(member))
      ),
      // Wanted conflict
      addUsersWithConstraints((group, userId) => group.every((member) => !options.data[userId].unwanted.includes(member))),
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
  options: Options
) =>
  range(iterations).reduce((prev) => {
    const curr = getGroups(options.initial, options)

    return getUnwantedAmount(curr, options) <= getUnwantedAmount(prev, options) &&
      getWantedAmount(curr, options) > getWantedAmount(prev, options)
      ? curr
      : prev
  }, options.initial)
