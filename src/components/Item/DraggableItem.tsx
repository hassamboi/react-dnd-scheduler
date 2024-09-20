import { UniqueIdentifier } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import { BaseItem } from '../../types';
import { useSortable } from '@dnd-kit/sortable';
import { ITEM_TYPE } from '../../constants';
import { Item } from './Item';

export type DraggableItemProps<TItem extends BaseItem = BaseItem> = {
  laneId: UniqueIdentifier;
  data: TItem;
  handle?: boolean;
  disabled?: boolean;
  style?(args: any): React.CSSProperties;
  renderItem?(): React.ReactElement;
  wrapperStyle?(): React.CSSProperties;
};

export const DraggableItem = <TItem extends BaseItem = BaseItem>({
  disabled,
  data,
  handle = false,
  renderItem,
  style = () => ({}),
  laneId,
  wrapperStyle,
}: DraggableItemProps<TItem>) => {
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    isDragging,
    isSorting,
    transform,
    transition,
  } = useSortable({
    id: data.id,
    data: {
      type: ITEM_TYPE,
      data,
    },
  });
  const mounted = useMountStatus();
  const mountedWhileDragging = isDragging && !mounted;

  return (
    <Item
      ref={disabled ? undefined : setNodeRef}
      data={data}
      dragging={isDragging}
      sorting={isSorting}
      handle={handle}
      handleProps={handle ? { ref: setActivatorNodeRef } : undefined}
      wrapperStyle={wrapperStyle && wrapperStyle()}
      style={{
        ...style({
          data,
          isDragging,
          isSorting,
          laneId,
        }),
      }}
      transition={transition}
      transform={transform}
      fadeIn={mountedWhileDragging}
      listeners={listeners}
      renderItem={renderItem}
    />
  );
};

function useMountStatus() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsMounted(true), 500);

    return () => clearTimeout(timeout);
  }, []);

  return isMounted;
}
