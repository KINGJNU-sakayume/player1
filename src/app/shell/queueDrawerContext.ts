import { createContext, useContext } from 'react';

export interface QueueDrawerControls {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

export const QueueDrawerContext = createContext<QueueDrawerControls>({
  open: () => undefined,
  close: () => undefined,
  isOpen: false,
});

export function useQueueDrawer(): QueueDrawerControls {
  return useContext(QueueDrawerContext);
}
