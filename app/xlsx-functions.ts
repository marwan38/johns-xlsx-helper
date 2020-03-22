/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
import ExcelJS from 'exceljs';
import { bus } from './message-bus';

function excelRichTextToString(obj) {
  let normalized = obj;
  if (typeof obj === 'object') {
    normalized = '';
    obj.richText.forEach(richTextObj => {
      normalized += richTextObj.text;
    });
  }
  return normalized;
}

// eslint-disable-next-line no-underscore-dangle
function _findWord(word, sentence) {
  if (!sentence || sentence === '') {
    return [];
  }
  const normalized = excelRichTextToString(sentence);

  return normalized
    .split(' ')
    .filter(word => word !== ' ')
    .reduce((acc, val, index) => {
      if (
        ` ${val.toLowerCase().trim()} ` === ` ${word.toLowerCase().trim()} `
      ) {
        return acc.concat(index);
      }
      return acc;
    }, []);
}

// eslint-disable-next-line no-underscore-dangle
function _compareStrings(stringA, stringB) {
  if (!stringA || !stringB) return null;
  const normalizedStringA = excelRichTextToString(stringA);
  const normalizedStringB = excelRichTextToString(stringB);

  const split = normalizedStringA.split(' ');
  const changeIndexes = [];
  split.forEach((word, i) => {
    if (
      !` ${normalizedStringB.toLowerCase()} `.includes(
        ` ${word.toLowerCase()} `
      )
    )
      changeIndexes.push(i);
  });

  return changeIndexes;
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

  for (let r = 1; r < totalRows; r++) {
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

export function differencesFn({ cell, changeIndex = [], wordSearch = [] }) {
  const cellValue = {
    richText: []
  };

  cell.text.split(' ').forEach((word, i) => {
    if (word === '' || word === ' ') {
      return;
    }
    const obj = { text: `${word} ` };
    // Is different

    const changeIndexIndex = changeIndex.indexOf(i);
    if (changeIndexIndex > -1) {
      obj.font = { color: { argb: 'FFDE1738' } };
    }

    const wordSearchIndex = wordSearch.indexOf(i);
    if (wordSearchIndex > -1) {
      obj.font = { color: { argb: 'FF32CD32' } };
    }

    cellValue.richText.push(obj);
  });
  cell.value = cellValue;

  return cell;
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
          cell: ws.getCell(cellAAddress),
          changeIndex: cellAChangeIndex,
          wordSearch: wordSearchCell && _findWord(wordSearchCell, cellA)
        });
        columnBDifferences.push({
          cell: ws.getCell(cellBAddress),
          changeIndex: cellBChangeIndex,
          wordSearch: wordSearchCell && _findWord(wordSearchCell, cellB)
        });
      }
    }
  }

  compareFn();

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
