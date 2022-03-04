import map from "lodash.map"
import flatMap from "lodash.flatmap"
import flow from "lodash.flow"
import mean from "lodash.mean"
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
export type UserData = {
  /**
   * The id of the user
   */
  id: UserId
  /**
   * Users that are wanted to be in a group with
   */
  wanted: UserId[]
  /**
   * Users that are not wanted to be in a group with
   */
  unwanted: UserId[]
  /**
   * The gender of the user
   */
  gender: Gender
}

/**
 * Type for a group of users
 */
export type Group = {
  /**
   * The id of the group
   */
  id: GroupId
  /**
   * The members of the group
   */
  users: UserId[]
}

/**
 * Type for the id of a group
 */
export type GroupId = string

/**
 * Options for group creating
 */
export type Options = {
  /**
   * The desired size of groups
   */
  groupSize: number
  /**
   * The desired amount of wanted users for each user
   */
  desiredWantedAmount: number
  /**
   * The initial groups
   */
  initial: Group[]
  /**
   * The user data
   */
  data: UserData[]
}

/**
 * Gets an item in an array by id
 * @param items The items to find in
 * @param id The id to look for
 * @returns An item with the id if it exists, otherwise undefined
 */
const getById = <T extends { id: string }>(items: T[], id: string): T | undefined =>
  items.find(({ id: itemId }) => itemId == id)

/**
 * Updates an group in a set of groups
 * @param groups The initial groups
 * @param updatedGroup The updated group
 * @returns A group with the updated group replacing the old group
 */
const groupsUpdate = (groups: Group[], updatedGroup: Group): Group[] => [
  ...groups.filter(({ id }) => id != updatedGroup.id),
  updatedGroup,
]

/**
 * Returns function that finds if another user is unwanted by certain prefs
 * @param byPrefs The prefs to determine by
 * @returns A function that returns whether another user is unwanted
 */
const isUnwanted = (byPrefs: UserData) => (user: UserId) => byPrefs.unwanted.includes(user)

/**
 * Returns function that finds if another user is wanted by certain prefs
 * @param byPrefs The prefs to determine by
 * @returns A function that returns whether another user is wanted
 */
const isWanted = (byPrefs: UserData) => (user: UserId) => byPrefs.wanted.includes(user)

/**
 * Returns function that finds if a user is of a certain gender
 * @param gender The gender to determine by
 * @param options The groups options
 * @returns A function that returns whether a user is of a certain gender
 */
const isGender =
  (gender: Gender, { data }: Options) =>
  (user: UserId) =>
    getById(data, user)!.gender == gender

/**
 * Gets the unused users in a set of groups
 * @param groups The groups to look through
 * @param data The data to get all users with
 * @returns The unused users
 */
const getUnusedUsers = (groups: Group[], data: UserData[]) =>
  data.filter((user) => !groups.some((group) => group.users.includes(user.id)))

/**
 * Sorts groups by the amount of members
 * @param groups The groups to sort
 * @returns Sorted groups
 */
const sortGroupsByLength = (groups: Group[]) =>
  groups
    .sort((group, otherGroup) => group.users.length - otherGroup.users.length)
    .filter(({ users }) => users.length > 0)

/**
 * Gets how many users have people have at least one person they want in their group
 * @param groups The groups to look through
 * @param options The groups options
 * @returns The amount of users that have people have people they want in their group
 */
export const getWantedAmount = (groups: Group[], { data }: Options) =>
  groups.flatMap((group) =>
    group.users.filter((user) => group.users.some(isWanted(getById(data, user)!)))
  ).length

/**
 * Gets how many users have people have at least one person they want in their group
 * @param groups The groups to look through
 * @param options The groups options
 * @returns The amount of users that have people have people they want in their group
 */
export const getUnwantedAmount = (groups: Group[], { data }: Options) =>
  groups.flatMap((group) =>
    group.users.filter((user) =>
      group.users.some((otherUser) => getById(data, user)!.unwanted.includes(otherUser))
    )
  ).length

// Higher is more wanted
/**
 * Gets how much other users prefer a group without this member compared to one with them,
 * lower means the group prefers the group without this member
 * @param group The group to get prefs from
 * @param member The member to get the score of
 * @param options The groups options
 * @returns How much other users prefer a group without this member compared to one with them
 */
export const getGroupScore = (group: Group, member: UserId, options: Options): number =>
  without(group.users, member).reduce(
    (score, otherMember) =>
      score +
      compareGroupsByPreference(
        getById(options.data, otherMember)!,
        { ...group, users: without(group.users, member) },
        group,
        options
      ),
    0
  )

export const avgWithoutZero = (array: number[]) =>
  flow(mean, (avg) => (isNaN(avg) ? 0 : avg))(array)

/**
 * Gets the average number of wanted people for each user
 * @param groups The groups to check from
 * @param options The groups options
 * @returns The amount of wanted per user
 */
export const wantedPerUser = (groups: Group[], { data }: Options) =>
  flow(
    (groups: Group[]) =>
      flatMap(groups, (group) =>
        group.users.map((user) =>
          without(group.users, user).filter((otherUser) =>
            data.find((u) => u.id == user)?.wanted.includes(otherUser)
          )
        )
      ),
    (usersWanted) => map(usersWanted, (wanted: UserId[]) => wanted.length)
  )(groups)

/**
 * Gets the group with the correct number of a gender
 * Removes the least wanted users of a certain gender until they are less than or
 * equal to half of the desired group size
 * @param group The group to balance
 * @param gender The gender to balance
 * @param options The groups options
 * @returns The group with the correct number of a gender
 */
export const balanceGender = (group: Group, gender: Gender, options: Options): Group => {
  if (group.users.filter(isGender(gender, options)).length > Math.floor(options.groupSize / 2)) {
    const leastWanted = group.users
      .filter(isGender(gender, options))
      .sort(
        (member, otherMember) =>
          getGroupScore(group, member, options) - getGroupScore(group, otherMember, options)
      )
    return balanceGender({ ...group, users: without(group.users, leastWanted[0]) }, gender, options)
  }
  return group
}

/**
 * Gets if a new user is wanted more than any other user
 * Gets if a group with the new user replacing another user compares better to the original group
 * @param newUser The new user
 * @param group The group to check
 * @param options The groups options
 * @returns If a new user is wanted more than any other user
 */
export const groupWantsUser = (newUser: UserId, group: Group, options: Options): boolean =>
  group.users
    .map((member) =>
      // The total compare score of all of the users
      without(group.users, member).reduce(
        (score, otherMember) =>
          score +
          compareGroupsByPreference(
            getById(options.data, otherMember)!,
            { ...group, users: [...without(group.users, member), newUser] },
            group,
            options
          ),
        0
      )
    )
    .some((rank) => rank < 0)

/**
 * Gets the user who is less wanted than a new user or undefined if there isn't one
 * @param newUser The new user
 * @param group The group to check
 * @param options The groups options
 * @returns The user who is less wanted than a new user or undefined if there isn't one
 */
export const groupLessWantedUser = (
  newUser: UserId,
  group: Group,
  options: Options
): UserId | undefined =>
  group.users
    .map((member) => ({
      member,
      // Sum of comparing group to group with user replaced
      rank: group.users.reduce(
        (score, otherMember) =>
          score +
          compareGroupsByPreference(
            getById(options.data, otherMember)!,
            { ...group, users: [...without(group.users, member), newUser] },
            group,
            options
          ),
        0
      ),
    }))
    .filter(({ rank }) => rank < 0)
    // Sort from lowest to highest score -- most wanted replaced group to least wanted
    .sort(({ rank }, { rank: otherRank }) => rank - otherRank)?.[0]?.member

/**
 * Compares group to be sorted from most to least liked
 * @param prefs The prefs to use
 * @param group A group
 * @param otherGroup A group to compare with
 * @param options The groups options
 * @returns A negative if the first group is more preferred, 0 if equal,
 * or positive if other group is preferred
 */
export const compareGroupsByPreference = (
  prefs: UserData,
  group: Group,
  otherGroup: Group,
  { desiredWantedAmount }: Options
) =>
  (group.users.filter(isUnwanted(prefs)).length -
    otherGroup.users.filter(isUnwanted(prefs)).length) *
    2000 +
  (group.users.filter(isWanted(prefs)).length > desiredWantedAmount + 1 ? 2 : 0) +
  (otherGroup.users.filter(isWanted(prefs)).length > desiredWantedAmount + 1 ? -2 : 0) +
  (group.users.filter(isWanted(prefs)).length > 0 ? -3 : 3) +
  (otherGroup.users.filter(isWanted(prefs)).length > 0 ? 3 : -3) +
  (group.users.filter(isWanted(prefs)).length == desiredWantedAmount ? -6 : 6) +
  (otherGroup.users.filter(isWanted(prefs)).length == desiredWantedAmount ? 6 : -6)

/**
 * Sorts groups by preference
 * @param prefs The preference to sort by
 * @param groups The groups to sort
 * @param options The groups options
 * @returns The sorted ids of the groups
 */
const sortGroupsByPreference = (prefs: UserData, groups: Group[], options: Options) =>
  groups.sort((group, otherGroup) => compareGroupsByPreference(prefs, group, otherGroup, options))

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
 * @param options The groups options
 * @returns Groups with all users
 */
const getGroups = (initial: Group[], options: Options): Group[] =>
  flow(
    shuffle,
    (shuffled: UserData[]) =>
      shuffled.reduce(
        (groups, userData) =>
          sortGroupsByPreference(userData, groups, options).reduce((groups, currentGroup) => {
            if (groups.some((group) => group.users.includes(userData.id))) {
              return groups
            } else if (
              currentGroup.users.length < options.groupSize &&
              currentGroup.users.every(
                (member) => !getById(options.data, member)!.unwanted.includes(userData.id)
              )
            ) {
              return groupsUpdate(
                groups,
                balanceGender(
                  { ...currentGroup, users: [...currentGroup.users, userData.id] },
                  getById(options.data, userData.id)!.gender,
                  options
                )
              )
            } else if (groupWantsUser(userData.id, currentGroup, options)) {
              return groupsUpdate(
                groups,
                balanceGender(
                  {
                    ...currentGroup,
                    users: [
                      ...without(
                        currentGroup.users,
                        groupLessWantedUser(userData.id, currentGroup, options)!
                      ),
                      userData.id,
                    ],
                  },
                  getById(options.data, userData.id)!.gender,
                  options
                )
              )
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
 * @param options The groups options
 * @param initial The initial groups
 * @returns The group with unused users added
 */
export const withUnusedUsers =
  (options: Options) =>
  (initial: Group[]): Group[] => {
    const addUsersWithConstraints =
      (constraints: (group: Group, userId: UserId) => boolean) => (initial: Group[]) =>
        getUnusedUsers(initial, options.data).reduce(
          (groups, { id: userId }) =>
            sortGroupsByLength(groups).reduce((groups, currentGroup) => {
              // Skip if already included
              if (groups.some(({ users }) => users.includes(userId))) {
                return groups
              } else if (constraints(currentGroup, userId)) {
                return groupsUpdate(groups, {
                  ...currentGroup,
                  users: [...currentGroup.users, userId],
                })
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
          group.users.length < options.groupSize &&
          group.users.every(
            (member) => !getById(options.data, member)!.unwanted.includes(userId)
          ) &&
          group.users.every(
            (member) => !getById(options.data, userId)!.unwanted.includes(member)
          ) &&
          group.users.filter(isGender(getById(options.data, userId)!.gender, options)).length <
            Math.floor(options.groupSize / 2)
      ),
      // With gender conflict
      addUsersWithConstraints(
        (group, userId) =>
          group.users.length < options.groupSize &&
          group.users.every(
            (member) => !getById(options.data, member)!.unwanted.includes(userId)
          ) &&
          group.users.every((member) => !getById(options.data, userId)!.unwanted.includes(member))
      ),
      // With length conflict
      addUsersWithConstraints(
        (group, userId) =>
          group.users.every(
            (member) => !getById(options.data, member)!.unwanted.includes(userId)
          ) &&
          group.users.every((member) => !getById(options.data, userId)!.unwanted.includes(member))
      ),
      // Wanted conflict
      addUsersWithConstraints((group, userId) =>
        group.users.every((member) => !getById(options.data, userId)!.unwanted.includes(member))
      ),
      // Add all others
      addUsersWithConstraints((_group, _userId) => true)
    )(initial)
  }

/**
 * Tries getting groups multiple times, then finds the best group based on:
 * - The amount of unwanted
 * - The difference from the desired group size
 * - The least amount of users with no wanted
 * - Not having 0 length
 *
 * @param iterations The amount of iterations
 * @param options The groups options
 * @returns The groups with the most wanted
 */
export const getGroupsIterations = (iterations: number, options: Options) =>
  range(iterations)
    .map(() => getGroups(options.initial, options))
    .sort(
      (curr, prev) =>
        (getUnwantedAmount(curr, options) <= getUnwantedAmount(prev, options) ? -1000 : 1000) +
        (wantedPerUser(curr, options) >= wantedPerUser(prev, options) ? -50 : 50) +
        (Math.abs(options.desiredWantedAmount - avgWithoutZero(wantedPerUser(curr, options))) <
        Math.abs(options.desiredWantedAmount - avgWithoutZero(wantedPerUser(prev, options)))
          ? -60
          : 60) +
        (wantedPerUser(curr, options).filter((a) => a == 0) <
        wantedPerUser(prev, options).filter((a) => a == 0)
          ? -310
          : 310) +
        (curr.flatMap((g: Group) => g.users).length > 0 ? -2000 : 2000) +
        (curr.flatMap((g: Group) => g.users).length > 0 &&
        prev.flatMap((g: Group) => g.users).length == 0
          ? -3000
          : 3000)
    )[0]
