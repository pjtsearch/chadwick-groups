# Chadwick Groups

Creates optimal groups based on members' wanted, unwanted, and gender.

## Algorithm

- Randomizes the users
- Reduces the randomized users to groups starting with the initial groups:
  - In each user, return the current groups sorted by their preference (most preferred to least preferred), reduced by
    - In each group:
      - Return the old groups if the user is already in a group
      - Add the user to the group if it is below size and the user isn't unwanted by others, then balance gender
      - Add the user to the group if they are more liked than another member,
              then balance gender
      - Otherwise, return the old groups
- Adds the unused users
    1. Adds unused users to groups sorted by length if there are no unwanted, gender, or size conflicts
    2. Adds unused users to groups sorted by length if there are no unwanted or size conflicts
    3. Adds unused users to groups sorted by length if there are no unwanted conflicts
    4. Adds unused users to groups sorted by length if there are no unwanted conflicts from other users
    5. Adds remaining unused users

## Usage Example

```typescript
getGroupsIterations(
    100, // Find best of 100 iterations
    {
        data: [ // The data of the users' preferences and gender
            { id: "a", unwanted: ["b"], wanted: ["c", "d"], gender: "male" },
            { id: "b", unwanted: [], wanted: ["a", "f"], gender: "female" },
            { id: "c", unwanted: ["d"], wanted: ["d", "g"], gender: "male" },
            { id: "d", unwanted: [], wanted: ["a", "c"], gender: "female" },
            { id: "e", unwanted: ["a"], wanted: ["h", "g"], gender: "male" },
            { id: "f", unwanted: [], wanted: ["e", "h"], gender: "female" },
            { id: "g", unwanted: ["c"], wanted: ["a", "c"], gender: "male" },
            { id: "h", unwanted: [], wanted: ["b", "e"], gender: "female" },
        ],
        groupSize: 4, // The desired group size
        initial: [ // The initial groups
            { id: "1", users: [] },
            { id: "2", users: [] },
            { id: "3", users: [] },
        ],
        desiredWantedAmount: 1, // How many wanted people should be in a group
    }
);
/*
Returns:
    [
        { id: '3', users: [ 'c', 'b' ] },
        { id: '1', users: [ 'e', 'h', 'f' ] },
        { id: '2', users: [ 'd', 'a', 'g' ] }
    ]
*/
```
