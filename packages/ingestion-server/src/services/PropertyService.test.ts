import "jest";
import { Event } from "../data/Event";
import { User } from "../data/User";
import {
  Property,
  PropFor,
  PropValue,
  PropDataType,
  PROPERTY_PREFIX,
} from "../data/Property";
import { LocalCache } from "../cache";
import { PropertyService } from "./PropertyService";

describe("PropertyService", () => {
  let cacheHasFn: jest.SpyInstance;
  let cacheGetFn: jest.SpyInstance;

  beforeEach(() => {
    // Disable cache
    cacheHasFn = jest
      .spyOn(LocalCache.prototype, "has")
      .mockImplementation((_: string) => Promise.resolve(false));
    cacheGetFn = jest
      .spyOn(LocalCache.prototype, "get")
      .mockImplementation((_: string) => Promise.resolve());
  });

  describe("convert2ColumnName", () => {
    test("add property prefix", () => {
      const result = PropertyService.convert2ColumnName("foo", []);
      expect(result).toBe(`${PROPERTY_PREFIX}_foo`);
    });

    test("remove leading/trailing spaces", () => {
      const result = PropertyService.convert2ColumnName("  foo  ", []);
      expect(result).toBe(`${PROPERTY_PREFIX}_foo`);
    });

    test("remove non-alphanumeric characters", () => {
      const result = PropertyService.convert2ColumnName("foo!$bar", []);
      expect(result).toBe(`${PROPERTY_PREFIX}_foobar`);
    });

    test("replace dots, dashes, and spaces with underscores", () => {
      const result = PropertyService.convert2ColumnName(
        "hello world.good-bye",
        []
      );
      expect(result).toBe(`${PROPERTY_PREFIX}_hello_world_good_bye`);
    });

    test("keep underscores", () => {
      const result = PropertyService.convert2ColumnName("foo_bar", []);
      expect(result).toBe(`${PROPERTY_PREFIX}_foo_bar`);
    });

    test("remove consecutive underscores", () => {
      const result = PropertyService.convert2ColumnName("foo__bar", []);
      expect(result).toBe(`${PROPERTY_PREFIX}_foo_bar`);
    });

    test("make lowercase", () => {
      const result = PropertyService.convert2ColumnName("FOO", []);
      expect(result).toBe(`${PROPERTY_PREFIX}_foo`);
    });

    test("less than 30 characters", () => {
      const result = PropertyService.convert2ColumnName(
        "123456789012345678901234567890123",
        []
      );
      expect(result).toBe(`${PROPERTY_PREFIX}_123456789012345678901234567890`);
    });

    test("ensure the column is unix with prefix", () => {
      const result = PropertyService.convert2ColumnName("foo", [
        `${PROPERTY_PREFIX}_foo`,
        `${PROPERTY_PREFIX}_foo1`,
      ]);
      expect(result).toBe(`${PROPERTY_PREFIX}_foo2`);
    });

    test("convert camelCase to snake_case", () => {
      const result = PropertyService.convert2ColumnName(
        "hello_worldGoodByeNOW",
        []
      );
      expect(result).toBe("p_hello_world_good_bye_now");
    });
  });

  describe("determineTupleType", () => {
    test("number", () => {
      const result = PropertyService.determineTupleType(1);
      expect(result).toBe(PropDataType.num);
    });

    test("zero", () => {
      const result = PropertyService.determineTupleType(0);
      expect(result).toBe(PropDataType.num);
    });

    test("negative number", () => {
      const result = PropertyService.determineTupleType(-123);
      expect(result).toBe(PropDataType.num);
    });

    test("floating point", () => {
      const result = PropertyService.determineTupleType(12.05);
      expect(result).toBe(PropDataType.num);
    });

    test("string", () => {
      const result = PropertyService.determineTupleType("hello");
      expect(result).toBe(PropDataType.str);
    });

    test("date string", () => {
      const result = PropertyService.determineTupleType("2023-01-14");
      expect(result).toBe(PropDataType.date);
    });

    test("timestamp", () => {
      const result = PropertyService.determineTupleType("2023-01-14T11:30:30");
      expect(result).toBe(PropDataType.date);
    });

    test("object", () => {
      const result = PropertyService.determineTupleType({});
      expect(result).toBe(PropDataType.str);
    });

    test("array", () => {
      const result = PropertyService.determineTupleType([]);
      expect(result).toBe(PropDataType.str);
    });

    test("null", () => {
      const result = PropertyService.determineTupleType(null);
      expect(result).toBe(null);
    });

    test("undefined", () => {
      const result = PropertyService.determineTupleType(undefined);
      expect(result).toBe(null);
    });
  });

  describe("getValueTuple", () => {
    const nullTuple = {
      str: null,
      num: null,
      bool: null,
      date: null,
    };

    test("assign value to type in tuple object", () => {
      const value = PropertyService.getValueTuple(false);
      expect(value).toEqual({ ...nullTuple, bool: false });
    });

    test("explicitly cast unknown value to string", () => {
      const value = PropertyService.getValueTuple({} as unknown as PropValue);
      expect(value).toEqual({ ...nullTuple, str: "{}" });
    });

    test("null returns an null tuple object", () => {
      const value = PropertyService.getValueTuple(null);
      expect(value).toEqual(nullTuple);
    });

    test("undefined returns null tuple object", () => {
      const value = PropertyService.getValueTuple(
        undefined as unknown as PropValue
      );
      expect(value).toEqual(nullTuple);
    });
  });

  describe("createPropColumns", () => {
    beforeEach(() => {
      Property.create = jest.fn();
      Property.addPropColumns = jest.fn();
      jest.spyOn(PropertyService, "getTableColumns").mockResolvedValue([]);
      jest
        .spyOn(PropertyService, "getPropertyDefinitionList")
        .mockResolvedValue([]);
    });

    test("return map of property names to column names", async () => {
      const result = await PropertyService.createPropColumns(PropFor.EVENT, [
        ["foo", "value"],
      ]);
      expect(result.get("foo")).toBe(`${PROPERTY_PREFIX}_foo`);
    });

    test("create new property", async () => {
      await PropertyService.createPropColumns(PropFor.EVENT, [
        ["foo", "value"],
      ]);
      expect(Property.create).toBeCalledWith([
        {
          name: "foo",
          column: `${PROPERTY_PREFIX}_foo`,
          for: PropFor.EVENT,
          data_type: PropDataType.str,
        },
      ]);
      expect(Property.addPropColumns).toBeCalledWith(PropFor.EVENT, [
        `${PROPERTY_PREFIX}_foo`,
      ]);
    });

    test("property already exists", async () => {
      jest
        .spyOn(PropertyService, "getTableColumns")
        .mockResolvedValue([`${PROPERTY_PREFIX}_foo`]);

      jest
        .spyOn(PropertyService, "getPropertyDefinitionList")
        .mockResolvedValue([
          {
            name: "foo",
            column: `${PROPERTY_PREFIX}_foo`,
            dataTypes: [PropDataType.str],
            for: PropFor.EVENT,
            timestamp: 0,
          },
        ]);

      await PropertyService.createPropColumns(PropFor.EVENT, [
        ["foo", "value"],
      ]);

      expect(Property.create).not.toBeCalled();
      expect(Property.addPropColumns).not.toBeCalled();
    });

    test("property exists in property table, but not as a table column", async () => {
      jest
        .spyOn(PropertyService, "getPropertyDefinitionList")
        .mockResolvedValue([
          {
            name: "foo",
            column: `${PROPERTY_PREFIX}_foo`,
            dataTypes: [PropDataType.str],
            for: PropFor.EVENT,
            timestamp: 0,
          },
        ]);

      await PropertyService.createPropColumns(PropFor.EVENT, [
        ["foo", "value"],
      ]);

      expect(Property.create).not.toBeCalled();
      expect(Property.addPropColumns).toBeCalledWith(PropFor.EVENT, [
        `${PROPERTY_PREFIX}_foo`,
      ]);
    });

    test("property value is null, no need to create property", async () => {
      await PropertyService.createPropColumns(PropFor.EVENT, [["foo", null]]);
      expect(Property.create).not.toBeCalled();
      expect(Property.addPropColumns).not.toBeCalled();
    });

    test("add new data-type to property table for existing property", async () => {
      jest
        .spyOn(PropertyService, "getTableColumns")
        .mockResolvedValue([`${PROPERTY_PREFIX}_foo`]);
      jest
        .spyOn(PropertyService, "getPropertyDefinitionList")
        .mockResolvedValue([
          {
            name: "foo",
            column: `${PROPERTY_PREFIX}_foo`,
            dataTypes: [PropDataType.str],
            for: PropFor.EVENT,
            timestamp: 0,
          },
        ]);

      await PropertyService.createPropColumns(PropFor.EVENT, [["foo", false]]);

      expect(Property.addPropColumns).not.toBeCalled();
      expect(Property.create).toBeCalledWith([
        {
          name: "foo",
          column: `${PROPERTY_PREFIX}_foo`,
          for: PropFor.EVENT,
          data_type: PropDataType.bool,
        },
      ]);
    });

    test("ignore case when matching with property definitions", async () => {
      jest
        .spyOn(PropertyService, "getPropertyDefinitionList")
        .mockResolvedValue([
          {
            name: "FoO",
            column: `${PROPERTY_PREFIX}_foo`,
            dataTypes: [PropDataType.str],
            for: PropFor.EVENT,
            timestamp: 0,
          },
        ]);

      await PropertyService.createPropColumns(PropFor.EVENT, [
        ["fOo", "value"],
      ]);
      expect(Property.create).not.toBeCalled();
    });

    describe("built-in properties", () => {
      beforeEach(() => {
        User.BUILT_IN_PROPERTIES["name"] = PropDataType.str;
        jest
          .spyOn(PropertyService, "getTableColumns")
          .mockResolvedValue(["name"]);
      });

      test("Create property definition but not the column", async () => {
        const colMap = await PropertyService.createPropColumns(PropFor.USER, [
          ["name", "value"],
        ]);
        expect(Property.addPropColumns).not.toBeCalled();
        expect(Property.create).toBeCalledWith([
          {
            column: "name",
            name: "name",
            data_type: PropDataType.str,
            for: PropFor.USER,
          },
        ]);
        expect(colMap.get("name")).toBe("name");
      });

      test("data types do not match, drop property value", async () => {
        const colMap = await PropertyService.createPropColumns(PropFor.USER, [
          ["name", 1],
          ["foo", "bar"],
        ]);
        expect(colMap.has("name")).not.toBeTruthy();
        expect(colMap.get("foo")).toBe(`${PROPERTY_PREFIX}_foo`);
      });

      test("case insensitive match", async () => {
        const colMap = await PropertyService.createPropColumns(PropFor.USER, [
          ["NaMe", "value"],
        ]);
        expect(colMap.get("NaMe")).toBe("name");
      });
    });
  });

  describe("getTableModel", () => {
    test("event", () => {
      const result = PropertyService.getTableModel(PropFor.EVENT);
      expect(result).toBe(Event);
    });

    test("user", () => {
      const result = PropertyService.getTableModel(PropFor.USER);
      expect(result).toBe(User);
    });

    test("unknown", () => {
      const result = PropertyService.getTableModel(
        "unknown" as unknown as PropFor
      );
      expect(result).toBe(null);
    });
  });

  describe("getTableColumns", () => {
    beforeEach(() => {
      Event.getColumns = jest.fn().mockResolvedValue(["event_col"]);
      User.getColumns = jest.fn().mockResolvedValue(["user_col"]);
    });

    test("event table", async () => {
      const result = await PropertyService.getTableColumns(PropFor.EVENT);
      expect(Event.getColumns).toBeCalled();
      expect(result).toEqual(["event_col"]);
    });

    test("user table", async () => {
      const result = await PropertyService.getTableColumns(PropFor.USER);
      expect(User.getColumns).toBeCalled();
      expect(result).toEqual(["user_col"]);
    });

    test("unknown table", async () => {
      const result = await PropertyService.getTableColumns(
        "unknown" as unknown as PropFor
      );
      expect(Event.getColumns).not.toBeCalled();
      expect(User.getColumns).not.toBeCalled();
      expect(result).toEqual([]);
    });

    test("use cache", async () => {
      cacheHasFn.mockResolvedValue(true);
      cacheGetFn.mockResolvedValue(["cached_col"]);
      const result = await PropertyService.getTableColumns(PropFor.EVENT);
      expect(cacheGetFn).toBeCalledWith("Object.getTableColumns#event");
      expect(Event.getColumns).not.toBeCalled();
      expect(result).toEqual(["cached_col"]);
    });
  });

  describe("castType", () => {
    test("native boolean", () => {
      const result = PropertyService.castType(false, PropDataType.bool);
      expect(result).toBe(false);
    });

    test("cast truthy number to boolean", () => {
      const result = PropertyService.castType(1, PropDataType.bool);
      expect(result).toBe(true);
    });

    test("cast falsy number to boolean", () => {
      const result = PropertyService.castType(0, PropDataType.bool);
      expect(result).toBe(false);
    });

    test("date string to unix epoch", () => {
      const result = PropertyService.castType(
        "2023-01-14T00:00:00.000Z",
        PropDataType.date
      );
      expect(result).toBe(1673654400000);
    });

    test("invalid date string", () => {
      const result = PropertyService.castType("wtf", PropDataType.date);
      expect(result).toBe(null);
    });

    test("native number", () => {
      const result = PropertyService.castType(1.234, PropDataType.num);
      expect(result).toBe(1.234);
    });

    test("invalid number", () => {
      const result = PropertyService.castType("one", PropDataType.num);
      expect(result).toBe(null);
    });

    test("cast to number", () => {
      const result = PropertyService.castType("5", PropDataType.num);
      expect(result).toBe(5);
    });

    test("native string", () => {
      const result = PropertyService.castType("hello", PropDataType.str);
      expect(result).toBe("hello");
    });

    test("cast anything to string", () => {
      const result = PropertyService.castType(
        { foo: "bar" } as unknown as string,
        PropDataType.str
      );
      expect(result).toBe('{"foo":"bar"}');
    });
  });

  describe("getPropertyDefinitionList", () => {
    beforeEach(() => {
      Property.getProps = jest
        .fn()
        .mockResolvedValue([
          { name: "foo", column: ``, dataTypes: [PropDataType.str] },
        ]);
    });

    test("use cache", async () => {
      cacheHasFn.mockResolvedValue(true);
      cacheGetFn.mockResolvedValue([
        { name: "cached", column: ``, dataTypes: [PropDataType.str] },
      ]);
      const result = await PropertyService.getPropertyDefinitionList(
        PropFor.EVENT
      );
      expect(cacheGetFn).toBeCalledWith(
        "Object.getPropertyDefinitionList#event"
      );
      expect(Property.getProps).not.toBeCalled();
      expect(result[0]).toEqual(expect.objectContaining({ name: "cached" }));
    });

    test("no cache", async () => {
      cacheHasFn.mockResolvedValue(false);
      cacheGetFn.mockResolvedValue(undefined);
      const result = await PropertyService.getPropertyDefinitionList(
        PropFor.EVENT
      );
      expect(cacheHasFn).toBeCalledWith(
        "Object.getPropertyDefinitionList#event"
      );
      expect(cacheGetFn).not.toBeCalledWith(
        "Object.getPropertyDefinitionList#event"
      );
      expect(Property.getProps).toBeCalled();
      expect(result[0]).toEqual(expect.objectContaining({ name: "foo" }));
    });
  });
});
