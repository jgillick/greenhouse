import { parseISO, isValid as isValidDate } from "date-fns";
import {
  Property,
  PropFor,
  PropDataType,
  PropertyRow,
  PropertyRecord,
} from "../data/Property";
import { Event } from "../data/Event";
import { User } from "../data/User";

/**
 * Manages creating new properties on the event and user tables.
 */
export const PropertyService = {
  /**
   * Return the property value formatted into the correct tuple space
   */
  getValueTuple(value: any) {
    const type = PropertyService.determineType(value);
    const tuple = {
      [type]: value,
    };
    return tuple;
  },

  /**
   * Create a valid column name from a user-defined string
   */
  convert2ColumnName(val: string, existing: string[]) {
    let column = val
      .toLowerCase()
      .trim()
      .replace(/[\.\-]/g, "_") // Convert dots and dashes to underlines
      .replace(/[^a-z0-9\s]/, "") // Remove unsupported characters
      .substring(0, 30);

    // Start with a p_ to denote it as a property
    column = `p_${column}`;

    // Ensure the column is unique
    let i = 0;
    let base = column;
    while (existing.includes(column)) {
      i++;
      column = `${base}${i}`;
    }

    return column;
  },

  /**
   * Determine the simplified prop data type
   */
  determineType(val: any) {
    switch (typeof val) {
      case "number":
        return PropDataType.num;
      case "boolean":
        return PropDataType.bool;
      case "string":
        // Is the string actually a date
        const isDate = isValidDate(parseISO(val));
        if (isValidDate(isDate)) {
          return PropDataType.date;
        }
        return PropDataType.str;
    }

    return PropDataType.str;
  },

  /**
   * Create new prop columns, if necessary
   */
  async createProps(
    propFor: PropFor,
    propsEntries: [/*name*/ string, /*value*/ string][]
  ): Promise<Map<string, string>> {
    const columnMap = new Map<string, string>();

    // Get existing prop definitions
    const existingProps = await Property.getProps(propFor);
    const existingPropMap = new Map<string, PropertyRecord>();
    existingProps.forEach((row) => {
      existingPropMap.set(row.name, row);
      columnMap.set(row.name, row.column);
    });

    // Get existing table columns directly
    const existingColumns = await this.getTableColumns(propFor);

    const newPropRecords: PropertyRow[] = [];
    const newPropColumns: string[] = [];

    // Find missing props
    propsEntries.forEach(([name, value]) => {
      const prop = existingPropMap.get(name);
      const dataType = this.determineType(value);
      let column = prop?.column;

      // A new property column needs to be created
      if (!prop || !column || (column && !existingColumns.includes(column))) {
        column = this.convert2ColumnName(name, existingColumns);
        newPropColumns.push(column);
      }

      // Register the property
      if (!prop || !prop.dataTypes.includes(dataType)) {
        newPropRecords.push({
          name,
          column,
          for: propFor,
          data_type: dataType,
        });
      }

      columnMap.set(name, column);
    });

    // Create property definitions
    let createDefs = Promise.resolve();
    if (newPropRecords.length) {
      createDefs = Property.create(newPropRecords);
    }

    // Add prop columns to table
    let createCols = Promise.resolve();
    if (newPropColumns.length) {
      createCols = Property.addPropColumns(propFor, newPropColumns);
    }

    await Promise.all([createDefs, createCols]);
    return columnMap;
  },

  /**
   * Get table model
   */
  getTableModel(table: PropFor) {
    switch (table) {
      case PropFor.EVENT:
        return Event;
      case PropFor.USER:
        return User;
      default:
        return null;
    }
  },

  /**
   * Get all the columns for a table
   */
  getTableColumns(table: PropFor): Promise<string[]> {
    const model = this.getTableModel(table);
    if (model) {
      return model?.getColumns();
    }
    return Promise.resolve([]);
  },
};
