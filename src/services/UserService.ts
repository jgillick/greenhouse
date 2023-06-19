import { User } from "../data/User";
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
    const existing = await User.get(id);

    // Return existing ID
    if (existing) {
      return existing;
    }

    // Create new user and alias this ID to it
    const userId = await User.create();
    await User.alias(userId, id);
    return User.get(id);
  },

  /**
   * Create a user alias
   * @param fromId - The user ID or previous alias ID
   * @param aliasId - The new ID to alias to this user
   */
  async alias(fromId: string, aliasId: string) {
    const user = await this.getOrCreate(fromId);
    await User.alias(user.id, aliasId);
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
    const data = propItems.reduce<Record<string, any>>(
      (prev, [name, value]) => {
        const col = propColumnMap.get(name);
        if (col) {
          const tuple = PropertyService.getValueTuple(value);
          prev[col as string] = tuple;
        }
        return prev;
      },
      {}
    );

    // Update record
    data.id = user.id;
    data.timestamp = user.timestamp;
    return User.update(data);
  },
};
