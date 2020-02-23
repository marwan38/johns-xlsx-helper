import React, { useRef, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { Intent, Position, Toaster } from '@blueprintjs/core';

import { Events } from '../events';

function Toast() {
  const ref = useRef();

  useEffect(() => {
    ipcRenderer.on(Events.Message, (_, { type, message }) => {
      const { current: toast } = ref;
      if (type === 'log' || type === 'error') {
        const intent = type === 'log' ? Intent.PRIMARY : Intent.DANGER;
        toast.show({ message, intent });
      }
    });
  }, []);

  return <Toaster position={Position.Bottom} autoFocus={false} ref={ref} />;
}

export default Toast;
