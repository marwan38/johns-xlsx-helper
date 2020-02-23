/* eslint-disable react/jsx-props-no-spreading */
import React, { useCallback, useState } from 'react';

import { useDropzone } from 'react-dropzone';
import { Button } from '@blueprintjs/core';
import { returnFileMeta } from '../utils';

type Props = {
  onUpload: () => void;
  style: React.CSSProperties;
};

function FileUploader({ onUpload, style = {} }: Props) {
  const [files, setFiles] = useState();
  const onDrop = useCallback(acceptedFiles => {
    setFiles(Array.prototype.map.call(acceptedFiles, returnFileMeta));
    onUpload(Array.prototype.map.call(acceptedFiles, returnFileMeta));
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div style={style}>
      <div {...getRootProps()}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p style={{ padding: 10 }}>Drop the files here ...</p>
        ) : (
          <Button icon="folder-open" text="Click here to browser files" />
        )}
      </div>
      {files && (
        <div style={{ display: 'flex', marginTop: 10 }}>
          <b style={{ marginRight: 10 }}>Files: </b>
          <div className=".bp3-monospace-text .bp3-running-text .bp3-text-muted">
            {files.length}
          </div>
        </div>
      )}
    </div>
  );
}

export default FileUploader;
