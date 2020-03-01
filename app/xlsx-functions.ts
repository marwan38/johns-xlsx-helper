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

// eslint-disable-next-line no-underscore-dangle
function _findWord(word, sentence) {
  if (!sentence || sentence === '') {
    return [];
  }

  return sentence.split(' ').reduce((acc, val, index) => {
    if (` ${val.toLowerCase()} `.includes(word.toLowerCase())) {
      return acc.concat(index);
    }
    return acc;
  }, []);
}

function changeColorOfWordInCell(cell, wordIndex, color) {
  const cellValue = {
    richText: []
  };
  cell.text.split(' ').forEach((word, i) => {
    const obj = { text: `${word} ` };

    if (i === wordIndex) {
      obj.font = { color: { argb: `FF${color.split('#')[1]}` } };
    }

    cellValue.richText.push(obj);
  });
  cell.value = cellValue;
}

function makeAddress(col: string, row: number) {
  return `${col.toUpperCase()}${row}`;
}

async function parseFile(name, path) {
  const book = new ExcelJS.Workbook();
  book.fileName = name;
  await book.xlsx.readFile(path);

  return book;
}

async function doFind(payload, file) {
  const { progress } = bus;

  progress('Parsing file..');
  const book = await parseFile(file.name, file.path);
  const ws = book.worksheets[0];
  progress('File parsed');

  const { columns: columnKeys, word } = payload;
  const wordColumn = ws.getColumn(word.toUpperCase());
  const allColumns = [];

  columnKeys.forEach(columnKey => {
    const col = ws.getColumn(columnKey.toUpperCase());
    allColumns.push(col);
  });

  const totalRows = allColumns.reduce((acc, val) => {
    if (val.values.length > acc) {
      return val.values.length;
    }
    return acc;
  }, 0);

  for (let r = 0; r < totalRows; r++) {
    progress(`Processing cell ${r} of ${totalRows}`, r / totalRows);
    const searchWord = wordColumn.values[r];
    allColumns.forEach((col, i) => {
      const colKey = columnKeys[i].toUpperCase();
      const columnValue = col.values[r];
      const address = makeAddress(colKey, r);

      const indexOfSearchWordsFound = _findWord(searchWord, columnValue);

      indexOfSearchWordsFound.forEach(foundIndex => {
        const cell = ws.getCell(address);
        changeColorOfWordInCell(cell, foundIndex, '#32CD32');
      });
    });
  }

  return book;
}

async function doCompare(compare, file) {
  const { find, columns } = compare;

  const { progress } = bus;
  progress('Parsing file..');
  const book = await parseFile(file.name, file.path);
  progress('File parsed');
  const ws = book.worksheets[0];
  const columnA = ws.getColumn(columns[0].toUpperCase());
  const columnADifferences = [];
  const columnB = ws.getColumn(columns[1].toUpperCase());
  const columnBDifferences = [];

  // Counter
  const startingPoint = 2; // 2 is the first row after the header (row 1);
  let count = 0;
  const totalRows =
    (columnA.values.length > columnB.values.length
      ? columnA.values.length
      : columnB.values.length) - startingPoint;

  function progressUpdate(cell) {
    progress(`Processing cell ${cell} of ${totalRows}`, cell / totalRows);
  }

  progress('Processing cells');

  function compareFn() {
    for (let i = 0; i <= totalRows; i++) {
      progressUpdate(count++);
      // eslint-disable-next-line no-continue
      if (i <= 1) continue;
      const cellA = columnA.values[i];
      const cellAAddress = `${columns[0].toUpperCase()}${i}`;
      const cellB = columnB.values[i];
      const cellBAddress = `${columns[1].toUpperCase()}${i}`;
      let wordSearchCell;
      if (find) {
        wordSearchCell = ws.getColumn(find.toUpperCase()).values[i];
      }

      if (!cellA || !cellB) {
        // eslint-disable-next-line no-continue
        continue;
      }

      const compared = [
        _compareStrings(cellA, cellB),
        _compareStrings(cellB, cellA)
      ];
      if (compared !== null) {
        const [cellAChangeIndex, cellBChangeIndex] = compared;
        columnADifferences.push({
          address: cellAAddress,
          changeIndex: cellAChangeIndex,
          wordSearch: find ? _findWord(wordSearchCell, cellA) : null
        });
        columnBDifferences.push({
          address: cellBAddress,
          changeIndex: cellBChangeIndex,
          wordSearch: find ? _findWord(wordSearchCell, cellB) : null
        });
      }
    }
  }

  compareFn();

  function differencesFn({ address, changeIndex, wordSearch }) {
    const cell = ws.getCell(address);
    const cellValue = {
      richText: []
    };
    cell.text.split(' ').forEach((word, i) => {
      const obj = { text: `${word} ` };
      // Is different
      if (changeIndex && changeIndex.some(c => c === i)) {
        obj.font = { color: { argb: 'FFDE1738' } };
      }
      if (wordSearch && wordSearch.some(c => c === i)) {
        obj.font = { color: { argb: 'FF32CD32' } };
      }
      cellValue.richText.push(obj);
    });
    cell.value = cellValue;
  }

  columnADifferences.forEach(differencesFn);
  columnBDifferences.forEach(differencesFn);

  return book;
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
  doCompare,
  doFind
};
