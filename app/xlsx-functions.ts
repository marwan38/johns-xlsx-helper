/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
import ExcelJS from 'exceljs';
import { bus } from './message-bus';

// eslint-disable-next-line no-underscore-dangle
function _compareStrings(stringA, stringB) {
  if (!stringA || !stringB) return null;
  if (typeof stringA !== 'string') {
    stringA = stringA.toString();
  }
  if (typeof stringB !== 'string') {
    stringB = stringB.toString();
  }
  const split = stringA.split(' ');
  const changeIndexes = [];
  split.forEach((word, i) => {
    if (!` ${stringB.toLowerCase()} `.includes(` ${word.toLowerCase()} `))
      changeIndexes.push(i);
  });

  return changeIndexes;
}

async function parseFile(name, path) {
  const book = new ExcelJS.Workbook();
  book.fileName = name;
  await book.xlsx.readFile(path);

  return book;
}

async function doCompare([columnAKey, columnBKey], file) {
  const { progress } = bus;
  progress('Parsing file..');
  const book = await parseFile(file.name, file.path);
  progress('File parsed');
  const ws = book.worksheets[0];
  const columnA = ws.getColumn(columnAKey.toUpperCase());
  const columnADifferences = [];
  const columnB = ws.getColumn(columnBKey.toUpperCase());
  const columnBDifferences = [];

  // Counter
  let count = 0;
  const totalRows =
    columnA.values.length > columnB.values.length
      ? columnA.values.length
      : columnB.values.length;

  function progressUpdate(cell) {
    progress(`Processing cell ${cell} of ${totalRows}`, cell / totalRows);
  }

  progress('Processing cells');

  function compareFn() {
    for (let i = 2; i <= totalRows; i++) {
      const cellA = columnA.values[i];
      const cellAAddress = `${columnAKey.toUpperCase()}${i}`;
      const cellB = columnB.values[i];
      const cellBAddress = `${columnBKey.toUpperCase()}${i}`;

      const compared = [
        _compareStrings(cellA, cellB),
        _compareStrings(cellB, cellA)
      ];
      if (compared !== null) {
        const [cellACompared, cellBCompared] = compared;
        columnADifferences.push({
          address: cellAAddress,
          compared: cellACompared
        });
        columnBDifferences.push({
          address: cellBAddress,
          compared: cellBCompared
        });
      }

      progressUpdate(count++);
    }
  }

  compareFn();

  function differencesFn({ address, compared }) {
    const cell = ws.getCell(address);
    const cellValue = {
      richText: []
    };
    cell.text.split(' ').forEach((word, i) => {
      const obj = { text: `${word} ` };
      // Is different
      if (compared && compared.some(c => c === i)) {
        obj.font = { color: { argb: 'FFDE1738' } };
      }
      cellValue.richText.push(obj);
    });
    cell.value = cellValue;
  }

  columnADifferences.forEach(differencesFn);
  columnBDifferences.forEach(differencesFn);
}

async function doMerge(files) {
  const { progress } = bus;
  const workbooks = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    const book = await parseFile(file.name, file.path);
    workbooks.push(book);
  }

  // First book
  const mergedBook = new ExcelJS.Workbook();
  mergedBook.addWorksheet('merged');

  const allRows = [];
  let count = 1;
  const totalCount = workbooks.length;

  // eslint-disable-next-line no-restricted-syntax
  for (const book of workbooks) {
    progress(`Processing book ${count}/${totalCount}`, count / totalCount);

    book.worksheets[0].eachRow({}, _row => {
      const copy = [..._row.values];
      // Add new colum in the row with the filename
      copy.unshift(book.fileName);
      allRows.push(copy);
    });

    count++;
  }

  mergedBook.worksheets[0].addRows(allRows);

  return mergedBook;
}

export default {
  doMerge,
  doCompare
};
