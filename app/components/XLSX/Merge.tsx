import React from 'react';
import { ipcRenderer } from 'electron';

import { Button } from '@blueprintjs/core';

import { Events } from '../../events';

type Props = {
  files: any[];
  output: string;
};

function Merge({ files, output }: Props) {
  return (
    <Button
      disabled={!files || !output}
      text="Start merge"
      onClick={() => {
        ipcRenderer.send(Events.Merge, {
          files,
          output
        });
      }}
    />
  );
}

export default Merge;
