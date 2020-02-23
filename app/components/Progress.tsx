import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { ProgressBar, Intent } from '@blueprintjs/core';
import styles from './progress.css';
import { Events } from '../events';

type Props = {
  style: object;
};

function Progress({ style = {} }: Props) {
  const [value, setValue] = useState(0);
  const [text, setText] = useState('Progres 1/2');

  useEffect(() => {
    ipcRenderer.on(Events.Progress, (_, { pct, message }) => {
      if (message) {
        setText(message);
      }
      if (pct) {
        setValue(pct);
      }
    });
  }, []);

  if (value === 0) {
    return null;
  }

  return (
    <div style={style}>
      {text && value !== 1 && (
        <div className="bp3-monospace-text bp3-running-text">{text}</div>
      )}
      <ProgressBar
        intent={value < 1 ? Intent.PRIMARY : Intent.SUCCESS}
        value={value}
        stripes={value !== 1}
        className={styles.progressBar}
      />
    </div>
  );
}

export default Progress;
