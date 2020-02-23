import React, { useState } from 'react';
import { ipcRenderer } from 'electron';
import { Button, InputGroup } from '@blueprintjs/core';

import { Events } from '../../events';

type Props = {
  files: any[];
  output: string;
};

function Compare({ files, output }: Props) {
  const [columnA, setColumnA] = useState('');
  const [columnB, setColumnB] = useState('');

  return (
    <>
      <div style={{ marginBottom: 10 }}>
        <InputGroup
          placeholder="Column A (Eg: j or J)"
          small
          value={columnA}
          onChange={e => setColumnA(e.target.value)}
        />
        <InputGroup
          placeholder="Column B (Eg: r or R)"
          small
          value={columnB}
          onChange={e => setColumnB(e.target.value)}
        />
      </div>
      <Button
        disabled={!files || !output || files.length > 1}
        text="Start compare"
        onClick={() => {
          ipcRenderer.send(Events.Compare, {
            file: files.length > 0 && files[0],
            output,
            values: [columnA, columnB]
          });
        }}
      />
    </>
  );
}

export default Compare;
