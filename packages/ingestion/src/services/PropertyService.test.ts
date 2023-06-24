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
import { PropertyService } from "./PropertyService";

describe("PropertyService", () => {
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
    test("assign value to type in tuple object", () => {
      const value = PropertyService.getValueTuple(false);
      expect(value).toEqual({ bool: false });
    });

    test("explicitly cast unknown value to string", () => {
      const value = PropertyService.getValueTuple({} as unknown as PropValue);
      expect(value).toEqual({ str: "{}" });
    });

    test("null returns an empty tuple object", () => {
      const value = PropertyService.getValueTuple(null);
      expect(value).toEqual({});
    });
  });

  describe("createPropColumns", () => {
    beforeEach(() => {
      Property.getProps = jest.fn().mockResolvedValue([]);
      Property.create = jest.fn();
      Property.addPropColumns = jest.fn();
      jest.spyOn(PropertyService, "getTableColumns").mockResolvedValue([]);
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
      Property.getProps = jest.fn().mockResolvedValue([
        {
          name: "foo",
          column: `${PROPERTY_PREFIX}_foo`,
          dataTypes: [PropDataType.str],
        },
      ]);

      await PropertyService.createPropColumns(PropFor.EVENT, [
        ["foo", "value"],
      ]);

      expect(Property.create).not.toBeCalled();
      expect(Property.addPropColumns).not.toBeCalled();
    });

    test("property exists in property table, but not as a table column", async () => {
      Property.getProps = jest.fn().mockResolvedValue([
        {
          name: "foo",
          column: `${PROPERTY_PREFIX}_foo`,
          dataTypes: [PropDataType.str],
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
      Property.getProps = jest.fn().mockResolvedValue([
        {
          name: "foo",
          column: `${PROPERTY_PREFIX}_foo`,
          dataTypes: [PropDataType.str],
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
  });
});
