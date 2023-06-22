import { User, UserRecord } from "../data/User";
import { UserAlias, AliasRecord } from "../data/UserAlias";
import { PropFor } from "../data/Property";
import { PropertyService } from "./PropertyService";

/**
 * Manages users
 */
export const UserService = {
  /**
   * Get or create user with ID.
   */
  async getOrCreate(id: string) {
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
   * Create a user alias
   * @param fromId - The user ID or previous alias ID
   * @param alias - The new value to alias to this user
   */
  async alias(fromId: string, alias: string) {
    const user = await this.getOrCreate(fromId);
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
  async setProperties(userId: string, props: Record<string, any>) {
    const user = await UserService.getOrCreate(userId);
    const propItems = Object.entries(props);

    // Create prop columns, if necessary
    const propColumnMap = await PropertyService.createProps(
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
      User.update([update]),
      User.setPropertyTimes(user.id, Object.keys(propData)),
    ]);
  },

  /**
   * Merge user records
   */
  async merge(userIdA: string, userIdB: string) {
    // Get users
    const users = await User.get([userIdA, userIdB]);
    if (users.length == 1) {
      return users[0];
    }

    // Ensure user A is the older record
    users.sort(
      (a: UserRecord, b: UserRecord) =>
        (a.created_at ?? 0) - (b.created_at ?? 0)
    );
    userIdA = users[0].id;
    userIdB = users[1].id;

    const userMap: Record<string, UserRecord> = {};
    users.forEach((user) => (userMap[user.id] = user));

    // Merge the most recent properties
    const merged: Record<string, any> = {};
    const latestProps = await User.mostRecentUserProperties(userIdA, userIdB);
    latestProps.forEach((prop) => {
      const name = prop.property;
      const user = userMap[prop.user_id];
      if (user) {
        merged[name] = user[name];
      }
    });

    // Update merged A and delete B
    const userAData: UserRecord = {
      ...userMap[userIdA],
      ...merged,
    };
    const userBData: UserRecord = {
      id: userIdB,
      is_deleted: 1,
    };
    const userRows = [userAData, userBData];

    // Update merge records
    const aliases = await UserAlias.getForUser(userIdB);
    const aliasUpdates = aliases.reduce<AliasRecord[]>((prev, item) => {
      // Delete previous alias
      prev.push({ alias: item.alias } as AliasRecord);

      // Reassociate
      item.user_id = userIdB;
      prev.push(item);

      return prev;
    }, []);

    // Run queries
    await Promise.all([User.update(userRows), UserAlias.update(aliasUpdates)]);
    return userAData;
  },
};
