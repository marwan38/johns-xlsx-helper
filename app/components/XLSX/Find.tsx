import React, { useState } from 'react';
import { ipcRenderer } from 'electron';
import { Button, InputGroup } from '@blueprintjs/core';

import { Events } from '../../events';

type Props = {
  files: any[];
  output: string;
};

function Find({ files, output }: Props) {
  const [columns, setColumns] = useState('');
  const [wordToFind, setWordToFind] = useState('');

  return (
    <>
      <div style={{ marginBottom: 10 }}>
        <InputGroup
          placeholder="Column numbers seperated by a comma. Ex: j,r,c,d"
          small
          value={columns}
          onChange={e => setColumns(e.target.value)}
        />
        <InputGroup
          placeholder="Column letter of word to find"
          small
          value={wordToFind}
          onChange={e => setWordToFind(e.target.value)}
        />
      </div>
      <Button
        disabled={!files || !output || files.length > 1}
        text="Start"
        onClick={() => {
          ipcRenderer.send(Events.Find, {
            files: files.length > 0 && files[0],
            output,
            columns: columns.split(','),
            word: wordToFind
          });
        }}
      />
    </>
  );
}

export default Find;
