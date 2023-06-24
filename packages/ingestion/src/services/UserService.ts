import { User, UserRecord } from "../data/User";
import { UserAlias } from "../data/UserAlias";
import { PropFor, PropValue } from "../data/Property";
import { PropertyService } from "./PropertyService";

/**
 * Manages users
 */
export const UserService = {
  /**
   * Get or create user with ID.
   */
  async getOrCreate(id: string): Promise<UserRecord> {
    const existing = await User.getOne(id);

    // Return existing ID
    if (existing) {
      return existing;
    }

    // Create new user and alias this ID to it
    const userId = await User.create();
    await UserAlias.create(userId, id);
    return User.getOne(id);
  },

  /**
   * Create an alias to a user.
   * Aliases are how we identify users externally.
   * An alias can be an system user ID, an email address, etc.
   * @param userId - The user ID or previous alias ID
   * @param alias - The new value to alias to this user
   */
  async alias(userId: string, alias: string) {
    const user = await this.getOrCreate(userId);
    const existing = await UserAlias.get(alias);

    // Create alias
    await UserAlias.create(user.id, alias);

    // Merge users
    if (existing && user.id !== existing.user_id) {
      await this.merge(user.id, existing.user_id);
    }
  },

  /**
   * Set properties on the user record
   */
  async setProperties(userId: string, props: Record<string, PropValue>) {
    const user = await this.getOrCreate(userId);
    const propItems = Object.entries(props);

    // Create prop columns, if necessary
    const propColumnMap = await PropertyService.createPropColumns(
      PropFor.USER,
      propItems
    );

    // Remap props to DB columns
    const propData = propItems.reduce((prev, [name, value]) => {
      const col = propColumnMap.get(name);
      if (col) {
        const tuple = PropertyService.getValueTuple(value);
        prev[col as string] = tuple;
      }
      return prev;
    }, {} as UserRecord);

    // Update DB
    const update = { ...user, ...propData };
    await Promise.all([
      User.update(update),
      User.setPropertyTimes(user.id, Object.keys(propData)),
    ]);
  },

  /**
   * Merge user records
   * @param userA - The ID or alias to a user
   * @param userB - The ID or alias to a user
   */
  async merge(userA: string, userB: string) {
    const users = await User.get([userA, userB]);

    // If both IDs belong to the same user, no need to merge.
    // This can happen even if both IDs are different, because
    // the IDs are aliased to the same user.
    if (users.length == 1) {
      return users[0];
    }

    // Ensure user A is the older record
    users.sort(
      (a: UserRecord, b: UserRecord) =>
        (a.created_at ?? 0) - (b.created_at ?? 0)
    );
    const userIdA = users[0].id;
    const userIdB = users[1].id;

    const userMap: Record<string, UserRecord> = {};
    users.forEach((user) => (userMap[user.id] = user));

    // Merge the most recent properties
    const merged: Partial<UserRecord> = {};
    const latestProps = await User.mostRecentUserProperties(userIdA, userIdB);
    latestProps.forEach((prop) => {
      const name = prop.property;
      const user = userMap[prop.user_id];
      if (user) {
        merged[name] = user[name];
      }
    });

    // Update user A data
    const mergedData: UserRecord = {
      ...userMap[userIdA],
      ...merged,
    };

    // Reassociate all User B aliases to A
    const aliases = await UserAlias.getForUser(userIdB);
    const aliasUpdates = aliases.map((item) => ({
      ...item,
      user_id: userIdA,
    }));

    // Run queries
    await Promise.all([
      User.delete(userIdB),
      User.update(mergedData),
      UserAlias.update(aliasUpdates),
    ]);
    return mergedData;
  },
};
