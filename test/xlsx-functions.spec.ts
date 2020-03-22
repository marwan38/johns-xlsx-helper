import { differencesFn } from '../app/xlsx-functions';

const getExpectedResultValue = (cell, changeIndex, wordSearchIndexes = []) => {
  return {
    text: cell.text,
    value: {
      richText: cell.text
        .split(' ')
        .filter(word => word !== ' ')
        .map((word, i) => {
          const value = {
            text: `${word} `
          };

          if (changeIndex.some(change => change === i)) {
            value['font'] = { color: { argb: 'FFDE1738' } };
          }
          if (wordSearchIndexes.some(change => change === i)) {
            value['font'] = { color: { argb: 'FF32CD32' } };
          }
          return value;
        })
    }
  };
};

describe('differnceFns', () => {
  it(' should seperate words properly', () => {
    const cell = {
      text: 'i am some kind of text'
    };
    const changeIndexes = [0, 3];
    const wordSearchIndexes = undefined;
    const result = differencesFn({
      cell,
      changeIndex: changeIndexes,
      wordSearch: wordSearchIndexes
    });

    expect(result).toStrictEqual(
      getExpectedResultValue(cell, changeIndexes, wordSearchIndexes)
    );
  });

  it(' should seperate color properly', () => {
    const cell = {
      text: 'E-Z CLEAN 4" BLADE MG0014A MEGADYNE'
    };
    const changeIndexes = [];
    const wordSearchIndexes = [4];
    const result = differencesFn({
      cell,
      changeIndex: changeIndexes,
      wordSearch: wordSearchIndexes
    });
    console.log(JSON.stringify(result, null, 2));
    expect(result).toStrictEqual(
      getExpectedResultValue(cell, changeIndexes, wordSearchIndexes)
    );
  });
});
