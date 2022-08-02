import { RowSelectOption } from "cdm/ComponentsModel";
import { DatabaseColumn, OptionSelect } from "cdm/DatabaseModel";
import { RowDataType, TableColumn } from "cdm/FolderModel";
import { ColumnsState } from "cdm/TableStateInterface";
import { DatabaseView } from "DatabaseView";
import { randomColor } from "helpers/Colors";
import {
  DEFAULT_COLUMN_CONFIG,
  InputType,
  TableColumnsTemplate,
} from "helpers/Constants";
import create from "zustand";

const useColumnsStore = (view: DatabaseView) => {
  return create<ColumnsState>()((set) => ({
    columns: view.columns,
    shadowColumns: view.shadowColumns,
    addToLeft: (column: TableColumn) =>
      set((updater) => {
        const columnInfo = generateNewColumnInfo(
          column.position - 1,
          updater.columns,
          updater.shadowColumns
        );
        const newLeftColumn: DatabaseColumn = {
          input: InputType.TEXT,
          accessorKey: columnInfo.name,
          key: columnInfo.name,
          label: columnInfo.label,
          position: columnInfo.position,
          config: DEFAULT_COLUMN_CONFIG,
        };
        view.diskConfig.addColumn(columnInfo.name, newLeftColumn);
        const leftIndex = updater.columns.findIndex(
          (column) => column.id === column.id
        );
        const newColumns = [
          ...updater.columns.slice(0, leftIndex),
          {
            ...TableColumnsTemplate,
            input: newLeftColumn.input,
            id: newLeftColumn.key,
            label: newLeftColumn.label,
            key: newLeftColumn.key,
            accessorKey: newLeftColumn.accessorKey,
            position: newLeftColumn.position,
            csvCandidate: true,
            config: newLeftColumn.config,
          },
          ...updater.columns.slice(leftIndex, updater.columns.length),
        ];
        return { columns: newColumns };
      }),
    addToRight: (column: TableColumn) =>
      set((updater) => {
        const newColumns = [...updater.columns];
        newColumns.splice(1, 0, column);
        return { columns: newColumns };
      }),
    remove: (column: TableColumn) =>
      set((updater) => {
        view.diskConfig.removeColumn(column.id);
        const filtered = updater.columns.filter((c) => c.id !== column.id);
        return { columns: filtered };
      }),
    alterSorting: (column: TableColumn) =>
      set((updater) => {
        const newColumns = [...updater.columns];
        const index = newColumns.findIndex((c) => c.id === column.id);
        newColumns[index].isSorted = column.isSorted;
        newColumns[index].isSortedDesc = column.isSortedDesc;
        return { columns: newColumns };
      }),
    addOptionToColumn: (
      column: TableColumn,
      option: string,
      backgroundColor: string
    ) =>
      set((updater) => {
        const optionIndex = updater.columns.findIndex(
          (col: TableColumn) => col.id === column.id
        );
        const newOption: RowSelectOption = {
          label: option,
          backgroundColor: backgroundColor,
        };

        updater.columns[optionIndex].options.push(newOption);
        view.diskConfig.updateColumnProperties(column.id, {
          options: updater.columns[optionIndex].options,
        });
        return { columns: updater.columns };
      }),
    alterColumnType: (
      column: TableColumn,
      input: string,
      parsedRows?: RowDataType[]
    ) =>
      set((updater) => {
        const typeIndex = updater.columns.findIndex(
          (col: TableColumn) => col.id === column.id
        );
        if (updater.columns[typeIndex].input === input) {
          // If the type is the same, do nothing
          return {};
        }
        // Save the new type in the disk config
        view.diskConfig.updateColumnProperties(column.id, {
          input: input,
        });
        updater.columns[typeIndex].input = input;
        switch (input) {
          case InputType.SELECT:
          case InputType.TAGS:
            const options: OptionSelect[] = [];
            // Generate selected options
            parsedRows.forEach((row) => {
              if (row[column.id]) {
                options.push({
                  label: row[column.id]?.toString(),
                  backgroundColor: randomColor(),
                });
              }
            });
            updater.columns[typeIndex].options = options;
            break;
          default:
          /**
           * GENERIC COLUMN TYPE Doesn't have options
           * Aplied to:
           * - TEXT
           * - NUMBER
           * - CALENDAR
           * - CALENDAR_TIME
           * - CHECKBOX
           */
        }
        return { columns: updater.columns };
      }),
  }));
};
/**
 * Adjust width of the columns when add a new column.
 * @param wantedPosition
 * @returns
 */
function generateNewColumnInfo(
  wantedPosition: number,
  columns: TableColumn[],
  shadowColumns: TableColumn[]
) {
  let columnNumber = columns.length - shadowColumns.length;
  // Check if column name already exists
  while (columns.find((o: any) => o.id === `newColumn${columnNumber}`)) {
    columnNumber++;
  }
  const columnId = `newColumn${columnNumber}`;
  const columnLabel = `New Column ${columnNumber}`;
  return { name: columnId, position: wantedPosition, label: columnLabel };
}

export default useColumnsStore;
/** 
case ActionTypes.UPDATE_COLUMN_TYPE:
      // Parse data
      const parsedData = state.view.rows.map((row: any) => ({
        ...row,
        [action.columnId]: DataviewService.parseLiteral(
          row[action.columnId],
          action.input, // Destination type to parse
          state.view.diskConfig.yaml.config
        ),
      }));
      // Update state
      switch (action.input) {
        case InputType.SELECT:
        case InputType.TAGS:
          const options: OptionSelect[] = [];
          // Generate selected options
          parsedData.forEach((row) => {
            if (row[action.columnId]) {
              options.push({
                label: row[action.columnId],
                backgroundColor: randomColor(),
              });
            }
          });
          // Update column to SELECT type
          return update(state, {
            skipReset: { $set: true },
            view: {
              columns: {
                $set: [
                  ...state.view.columns.slice(0, typeIndex),
                  {
                    ...state.view.columns[typeIndex],
                    input: action.input,
                    options: obtainUniqueOptionValues(options),
                  },
                  ...state.view.columns.slice(
                    typeIndex + 1,
                    state.view.columns.length
                  ),
                ],
              },

              // Update data associated to column
              rows: {
                $set: parsedData,
              },
            },
          });
        default:
          // 
          //  GENERIC update change
          //  Update column dataType & parsed data
          //  Aplied to:
          //  - TEXT
          //  - NUMBER
          //  - CALENDAR
          //  - CALENDAR_TIME
          //  - CHECKBOX
          //
          return update(state, {
            skipReset: { $set: true },
            view: {
              columns: {
                $set: [
                  ...state.view.columns.slice(0, typeIndex),
                  { ...state.view.columns[typeIndex], input: action.input },
                  ...state.view.columns.slice(
                    typeIndex + 1,
                    state.view.columns.length
                  ),
                ],
              },

              rows: {
                $set: parsedData,
              },
            },
          });
      }
      */
