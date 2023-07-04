import { parseISO, isValid as isValidDate } from "date-fns";
import { LocalCache, cache } from "../cache";
import {
  Property,
  PropFor,
  PropValue,
  PropertyTuple,
  PropDataType,
  PropertyRow,
  PropertyRecord,
  PROPERTY_PREFIX,
} from "../data/Property";
import { Event } from "../data/Event";
import { User } from "../data/User";

const cacheStore = new LocalCache(60);

/**
 * Manages creating new properties on the event and user tables.
 */
export class PropertyService {
  /**
   * Create a valid column name from a user-defined string
   */
  static convert2ColumnName(name: string, existing: string[]) {
    let column = name
      .trim()
      .replace(/([a-z])([A-Z])/g, "$1_$2") // convert camelCase to snake_case
      .replace(/[\.\-\s]/g, "_") // Convert dots and dashes to underlines
      .replace(/[^a-zA-Z0-9_]/g, "") // Remove unsupported characters
      .replace(/_+/g, "_") // Collapse multiple underscores
      .substring(0, 30)
      .toLowerCase();

    // Start with a p_ to denote it as a property
    column = `${PROPERTY_PREFIX}_${column}`;

    // Ensure the column is unique
    let i = 0;
    const base = column;
    while (existing.includes(column)) {
      i++;
      column = `${base}${i}`;
    }

    return column;
  }

  /**
   * Determine which tuple slot this value should go it.
   */
  static determineTupleType(val: unknown) {
    if (val === null || typeof val === "undefined") {
      return null;
    }

    switch (typeof val) {
      case "number":
        return PropDataType.num;
      case "boolean":
        return PropDataType.bool;
      case "object":
      case "string": {
        // Is the string actually a date
        if (typeof val === "string") {
          const isDate = isValidDate(parseISO(val));
          if (isDate) {
            return PropDataType.date;
          }
        }
        return PropDataType.str;
      }
    }
    return PropDataType.str;
  }

  /**
   * Return the property value formatted into the correct tuple space
   */
  static getValueTuple(value: PropValue | null): PropertyTuple {
    const nullTuple: PropertyTuple = {
      [PropDataType.str]: null,
      [PropDataType.num]: null,
      [PropDataType.bool]: null,
      [PropDataType.date]: null,
    };
    if (value === null) {
      return nullTuple;
    }

    const type = this.determineTupleType(value);
    if (type === null) {
      return nullTuple;
    }

    const castedValue = this.castType(value, type);
    return {
      ...nullTuple,
      [type]: castedValue,
    };
  }

  /**
   * Create new prop columns, if necessary
   */
  static async createPropColumns(
    propFor: PropFor,
    propsEntries: [/*name*/ string, /*value*/ unknown][]
  ): Promise<Map<string, string>> {
    const columnMap = new Map<string, string>();
    const builtInProps = this.getBuiltInProps(propFor);

    // Get existing prop definitions
    const existingProps = await this.getPropertyDefinitionList(propFor);
    const existingPropMap = new Map<string, PropertyRecord>();
    existingProps.forEach((row) => {
      existingPropMap.set(row.name.toLowerCase(), row);
      columnMap.set(row.name, row.column);
    });

    // Get existing table columns directly
    const existingColumns = await this.getTableColumns(propFor);

    // Find missing props
    const newPropTypeRecords: PropertyRow[] = [];
    const newPropColumns: string[] = [];
    propsEntries.forEach(([name, value]) => {
      const propDef = existingPropMap.get(name.toLowerCase());
      const registeredTypes = propDef?.dataTypes ?? [];
      const dataType = this.determineTupleType(value);
      let columnName = propDef?.column;

      // This is a built-in type, use the name as-is (but lower-cased)
      const builtInName = name.toLowerCase();
      if (builtInProps[builtInName]) {
        // If the data-types do not match, drop this property value
        if (dataType !== builtInProps[builtInName]) {
          return;
        }
        columnName = builtInName;
      }

      // Convert property name to column name
      if (!columnName) {
        columnName = this.convert2ColumnName(name, existingColumns);
      }

      // If the value is null, no need to create the column
      if (dataType === null) {
        return;
      }

      // A new property column needs to be created
      if (columnName && !existingColumns.includes(columnName)) {
        newPropColumns.push(columnName);
      }

      // Register the property if we haven't logged this data-type for it
      if (!registeredTypes.includes(dataType)) {
        newPropTypeRecords.push({
          name,
          column: columnName,
          for: propFor,
          data_type: dataType,
        });
      }

      columnMap.set(name, columnName);
    });

    // Create property definitions
    let createDefs = Promise.resolve();
    if (newPropTypeRecords.length) {
      createDefs = Property.create(newPropTypeRecords);
    }

    // Add prop columns to table
    let createCols = Promise.resolve();
    if (newPropColumns.length) {
      createCols = Property.addPropColumns(propFor, newPropColumns);
    }

    await Promise.all([createDefs, createCols]);
    return columnMap;
  }

  /**
   * Get table model
   */
  static getTableModel(table: PropFor) {
    switch (table) {
      case PropFor.EVENT:
        return Event;
      case PropFor.USER:
        return User;
      default:
        return null;
    }
  }

  /**
   * Get all the columns for a table
   */
  @cache(cacheStore)
  static getTableColumns(table: PropFor): Promise<string[]> {
    const model = this.getTableModel(table);
    if (model) {
      return model?.getColumns();
    }
    return Promise.resolve([]);
  }

  /**
   * Get the full list of property definition
   */
  @cache(cacheStore)
  static getPropertyDefinitionList(table: PropFor) {
    return Property.getProps(table);
  }

  /**
   * Get built-in strongly typed properties
   */
  static getBuiltInProps(table: PropFor): Record<string, PropDataType> {
    const model = this.getTableModel(table);
    if (model) {
      return model?.BUILT_IN_PROPERTIES ?? {};
    }
    return {};
  }

  /**
   * Cast the value to a type, or null
   */
  static castType(
    value: PropValue,
    type: PropDataType
  ): string | number | boolean | null {
    if (type === PropDataType.bool) {
      if (typeof value === "boolean") {
        return value;
      } else if (typeof value === "number") {
        return value ? true : false;
      }
    } else if (type === PropDataType.date && typeof value === "string") {
      const date = parseISO(value);
      const isDate = isValidDate(date);
      if (isDate) {
        return date.getTime();
      }
    } else if (type === PropDataType.num) {
      const num = Number(value);
      if (!isNaN(num)) {
        return num;
      }
    } else if (type === PropDataType.str) {
      if (typeof value === "string") {
        return value;
      }
      return JSON.stringify(value);
    }
    return null;
  }
}
