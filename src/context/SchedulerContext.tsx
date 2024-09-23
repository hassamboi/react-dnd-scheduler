import { Active, UniqueIdentifier } from '@dnd-kit/core';
import {
  createContext,
  Dispatch,
  FC,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { BaseItem, BaseLane } from '../types';
import { isInList } from '../utils';

export type ISchedulerContext<
  TLane extends BaseLane = BaseLane,
  TItem extends BaseItem = BaseItem
> = {
  lanes: TLane[];
  setLanes: Dispatch<SetStateAction<TLane[]>>;
  items: TItem[];
  setItems: Dispatch<SetStateAction<TItem[]>>;
  active: Active | null;
  setActive: Dispatch<SetStateAction<Active | null>>;
  isLane(id: UniqueIdentifier): boolean;
  isItem(id: UniqueIdentifier): boolean;
};

export type SchedulerProviderProps<
  TLane extends BaseLane = BaseLane,
  TItem extends BaseItem = BaseItem
> = {
  lanes?: TLane[];
  items?: TItem[];
  stepSize?: number;
};

export function createSchedulerProvider<
  TLane extends BaseLane = BaseLane,
  TItem extends BaseItem = BaseItem
>() {
  const SchedulerContext = createContext<ISchedulerContext<TLane, TItem> | null>(null);

  const SchedulerProvider: FC<PropsWithChildren<SchedulerProviderProps<TLane, TItem>>> = (
    props
  ) => {
    const [lanes, setLanes] = useState<TLane[]>(props.lanes ?? []);
    const [items, setItems] = useState<TItem[]>(props.items ?? []);
    const [active, setActive] = useState<Active | null>(null);

    const isLane = useCallback((id: UniqueIdentifier) => isInList(lanes, id), []);
    const isItem = useCallback((id: UniqueIdentifier) => isInList(items, id), []);

    const contextValue: ISchedulerContext<TLane, TItem> = useMemo(
      () => ({
        lanes,
        setLanes,
        items,
        setItems,
        active,
        setActive,
        isLane,
        isItem,
      }),
      [lanes, items, active, isLane, isItem]
    );

    return (
      <SchedulerContext.Provider value={contextValue}>{props.children}</SchedulerContext.Provider>
    );
  };

  const useScheduler = () => {
    const context = useContext(SchedulerContext);
    if (!context) {
      throw new Error('useScheduler must be used within a SchedulerProvider');
    }
    return context;
  };

  return { SchedulerProvider, useScheduler };
}
