import React, { useState } from 'react';
import { ipcRenderer, remote } from 'electron';
import { Tabs, Tab, Card, InputGroup } from '@blueprintjs/core';

import { Events } from '../events';

import FileUploader from './FileUploader';
import Progress from './Progress';
import Merge from './XLSX/Merge';
import Compare from './XLSX/Compare';
import Toaster from './Toaster';

// import { Link } from 'react-router-dom';
// import routes from '../constants/routes.json';
import styles from './Home.css';

export default function Home() {
  const [files, setFiles] = useState();
  const [activeTab, setActiveTab] = useState('merge');

  const [outputPath, setOutputPath] = useState(
    ipcRenderer.sendSync(Events.GetPath)
  );
  const [outputName, setOutputName] = useState('output');
  const outputFullPath = `${outputPath}\\${outputName}.xlsx`;

  const filesAvailable = files && files.length > 0;
  return (
    <div className={styles.container}>
      <FileUploader onUpload={setFiles} style={{ marginBottom: 20 }} />
      <InputGroup
        placeholder="Output path"
        onChange={() => {}}
        onClick={async () => {
          const { dialog } = remote;
          const dir = await dialog.showOpenDialog({
            properties: ['openDirectory']
          });
          setOutputPath(dir.filePaths);
        }}
        value={outputPath}
      />
      <InputGroup
        value={outputName}
        placeholder="Output file name"
        onChange={e => setOutputName(e.target.value)}
      />
      <Card
        style={{
          pointerEvents: !filesAvailable ? 'none' : 'auto',
          opacity: !filesAvailable ? 0.5 : 1,
          marginTop: 20
        }}
      >
        <Tabs
          id="TabsExample"
          onChange={setActiveTab}
          selectedTabId={activeTab}
        >
          <Tab
            id="merge"
            title="Merge"
            disabled={!files || files.length < 2}
            panel={<Merge output={outputFullPath} files={files} />}
          />
          <Tab
            id="compare"
            title="Compare"
            disabled={!files || files.length !== 1}
            panel={<Compare files={files} output={outputFullPath} />}
          />
        </Tabs>
      </Card>

      <Progress style={{ marginTop: 20 }} />
      <Toaster />
    </div>
  );
}
