import "jest";
import { v4 as uuid } from "uuid";
import { User, UserRecord } from "../data/User";
import { UserAlias, AliasRecord } from "../data/UserAlias";
import { PropFor } from "../data/Property";
import { PropertyService } from "./PropertyService";
import { UserService } from "./UserService";

describe("UserService", () => {
  describe("getOrCreate", () => {
    beforeEach(async () => {
      User.getOne = jest.fn().mockResolvedValue(undefined);
      UserAlias.create = jest.fn();
      User.create = jest.fn();
    });

    test("return existing user", async () => {
      const id = uuid();
      User.getOne = jest.fn().mockImplementation((alias_id: string) => ({
        id,
        alias_id,
      }));

      const user = await UserService.getOrCreate("user-id");
      expect(user.id).toBe(id);
      expect(User.create).not.toBeCalled();
    });

    test("create new user", async () => {
      let createdId: string;
      User.create = jest.fn().mockImplementation(() => {
        createdId = uuid();
        return createdId;
      });
      // Return undefined until User.create is called
      User.getOne = jest.fn().mockImplementation(() => {
        if (createdId) {
          return {
            id: createdId,
            alias_id: "alias",
          };
        }
      });

      const user = await UserService.getOrCreate("user-id");
      expect(User.create).toBeCalled();
      expect(UserAlias.create).toBeCalledWith(expect.anything(), "user-id");
      expect(User.getOne).toBeCalledTimes(2);
      expect(user.id).toBeDefined();
    });
  });

  describe("alias", () => {
    let user: UserRecord;

    beforeEach(async () => {
      user = {
        id: uuid(),
        alias_id: "alias",
      };

      User.getOne = jest.fn().mockResolvedValue(undefined);
      UserAlias.get = jest.fn();
      UserAlias.create = jest.fn();
      User.create = jest.fn();

      jest.spyOn(UserService, "getOrCreate").mockResolvedValue(user);
      jest
        .spyOn(UserService, "merge")
        .mockResolvedValue({} as unknown as UserRecord);
    });

    test("create alias", async () => {
      await UserService.alias("userId", "alias");

      expect(UserService.getOrCreate).toBeCalledWith("userId");
      expect(UserAlias.get).toBeCalledWith("alias");
      expect(UserAlias.create).toBeCalledWith(user.id, "alias");
      expect(UserService.merge).not.toBeCalled();
    });

    test("merge users if the alias exists and is attached to another user", async () => {
      const alias: AliasRecord = {
        id: uuid(),
        user_id: uuid(),
        alias: "alias",
      };
      UserAlias.get = jest.fn().mockResolvedValue(alias);
      await UserService.alias("userId", "alias");

      expect(UserService.getOrCreate).toBeCalledWith("userId");
      expect(UserAlias.get).toBeCalledWith("alias");
      expect(UserAlias.create).toBeCalledWith(user.id, "alias");
      expect(UserService.merge).toBeCalledWith(user.id, alias.user_id);
    });
  });

  describe("setProperties", () => {
    let user: UserRecord;

    beforeEach(async () => {
      user = {
        id: uuid(),
        alias_id: "alias",
      };

      User.update = jest.fn();
      User.setPropertyTimes = jest.fn();

      jest.spyOn(UserService, "getOrCreate").mockResolvedValue(user);
      jest
        .spyOn(PropertyService, "createPropColumns")
        .mockResolvedValue(new Map<string, string>());
    });

    test("create prop columns and update user and prop times", async () => {
      jest
        .spyOn(PropertyService, "createPropColumns")
        .mockResolvedValue(new Map<string, string>([["foo", "p_foo"]]));

      await UserService.setProperties(user.id, { foo: "bar" });

      expect(PropertyService.createPropColumns).toBeCalledWith(PropFor.USER, [
        ["foo", "bar"],
      ]);
      expect(User.update).toBeCalledWith({
        ...user,
        p_foo: {
          str: "bar",
        },
      });
      expect(User.setPropertyTimes).toBeCalledWith(user.id, ["p_foo"]);
    });
  });

  describe("merge", () => {
    let userA: UserRecord;
    let userB: UserRecord;

    beforeEach(async () => {
      userA = {
        id: uuid(),
        alias_id: "aliasA",
      };
      userB = {
        id: uuid(),
        alias_id: "aliasB",
      };

      User.get = jest.fn();
      User.update = jest.fn();
      User.delete = jest.fn();
      UserAlias.getForUser = jest.fn().mockResolvedValue([]);
      User.mostRecentUserProperties = jest.fn().mockResolvedValue([]);
      UserAlias.update = jest.fn();
    });

    test("if A & B alias to the same user, there is nothing to merge", async () => {
      User.get = jest.fn().mockResolvedValue([userA]);
      const result = await UserService.merge(
        userA.alias_id as string,
        userB.alias_id as string
      );
      expect(result.id).toBe(userA.id);
      expect(User.update).not.toBeCalled();
    });

    test("merge the more recent property values", async () => {
      userA = {
        ...userA,
        p_foo: { str: "bar" },
        p_boo: null,
      };
      userB = {
        ...userB,
        p_foo: { num: 1 },
        p_boo: { bool: false },
      };

      User.get = jest.fn().mockResolvedValue([userA, userB]);
      User.mostRecentUserProperties = jest.fn().mockResolvedValue([
        { property: "p_foo", user_id: userA.id },
        { property: "p_boo", user_id: userB.id },
      ]);

      const result = await UserService.merge(
        userA.alias_id as string,
        userB.alias_id as string
      );
      expect(result.p_foo).toEqual({ str: "bar" });
      expect(result.p_boo).toEqual({ bool: false });
    });

    test("sort A/B and merge into the older record and delete the younger record", async () => {
      userA = { ...userA, created_at: Date.now() };
      userB = { ...userB, created_at: Date.now() - 100 }; // B is older

      User.get = jest.fn().mockResolvedValue([userA, userB]);
      const result = await UserService.merge(userA.id, userB.id);

      expect(result.id).toBe(userB.id);
      expect(User.delete).toBeCalledWith(userA.id);
      expect(User.update).toBeCalledWith(
        expect.objectContaining({
          id: userB.id,
        })
      );
    });

    test("reassociate aliases from the user that will be deleted", async () => {
      userA = { ...userA, created_at: Date.now() };
      userB = { ...userB, created_at: Date.now() - 100 }; // B is older

      UserAlias.getForUser = jest
        .fn()
        .mockResolvedValue([{ id: "", user_id: "", alias: "alias" }]);
      User.get = jest.fn().mockResolvedValue([userA, userB]);

      await UserService.merge(userA.id, userB.id);
      expect(User.delete).toBeCalledWith(userA.id);
      expect(UserAlias.update).toBeCalledWith([
        { id: "", user_id: userB.id, alias: "alias" },
      ]);
    });
  });
});
