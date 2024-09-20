import {
  closestCenter,
  CollisionDetection,
  defaultDropAnimationSideEffects,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DropAnimation,
  KeyboardCoordinateGetter,
  Modifiers,
  MouseSensor,
  pointerWithin,
  SensorDescriptor,
  SensorOptions,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  SortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { BaseItem, BaseLane } from '../types';
import { createSchedulerProvider, ISchedulerContext } from '../context/SchedulerContext';
import { FC, useMemo } from 'react';
import { createSnapModifier } from '@dnd-kit/modifiers';
import { findIndexById } from '../utils';
import { LANE_TYPE, STEP_SIZE } from '../constants';
import { DroppableLane } from '../components/Lane';
import { DraggableItem } from '../components/Item/DraggableItem';
import { createPortal } from 'react-dom';

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

export type SchedulerProps<TItem extends BaseItem = BaseItem> = {
  adjustScale?: boolean;
  columns?: number;
  laneStyle?: React.CSSProperties;
  coordinateGetter?: KeyboardCoordinateGetter;
  getItemStyles?(args: {
    value: TItem;
    isDragging: boolean;
    laneId: UniqueIdentifier;
    isSorting: boolean;
    isDragOverlay: boolean;
  }): React.CSSProperties;
  wrapperStyle?(): React.CSSProperties;
  itemCount?: number;
  items?: TItem[];
  handle?: boolean;
  renderItem?(): React.ReactElement;
  strategy?: SortingStrategy;
  modifiers?: Modifiers;
  minimal?: boolean;
  scrollable?: boolean;
  vertical?: boolean;
  stepSize?: number;
  sensors?: SensorDescriptor<SensorOptions>[];
};

export function createScheduler<
  TLane extends BaseLane = BaseLane,
  TItem extends BaseItem = BaseItem
>(useScheduler: () => ISchedulerContext<TLane, TItem>) {
  const Scheduler: FC<SchedulerProps<TItem>> = ({
    adjustScale = false,
    handle = false,
    scrollable = false,
    minimal = false,
    vertical = false,
    modifiers: customModifiers,
    stepSize = STEP_SIZE,
    laneStyle,
    wrapperStyle = () => ({}),
    renderItem,
  }) => {
    const { items, lanes, active, setItems, setLanes, setActive, isItem, isLane } = useScheduler();

    const snapToGrid = useMemo(() => createSnapModifier(stepSize), [stepSize]);
    const modifiers = active && isItem(active.id) ? [snapToGrid] : customModifiers;
    const sensors = useSensors(useSensor(MouseSensor));

    const handleDragStart = ({ active }: DragStartEvent) => {
      setActive(active);
    };

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over, delta } = event;

      if (!active || !over) return;

      const isActiveLane = active.data.current?.type === LANE_TYPE;
      const isOverLane = over.data.current?.type === LANE_TYPE;

      if (isActiveLane && isOverLane) {
        setLanes((lanes) => {
          const activeIndex = findIndexById(lanes, active.id);
          const overIndex = findIndexById(lanes, over.id);

          return arrayMove(lanes, activeIndex, overIndex);
        });
      }

      const activeItem: TItem | undefined = active?.data?.current?.data;

      if (!activeItem) return;

      const newOffset = activeItem.offset + delta.y;
      const newLaneId: UniqueIdentifier | undefined = isOverLane
        ? over.id
        : over.data.current?.data?.laneId;

      const updatedItems = items.map((item) =>
        item.id === active.id ? { ...item, offset: newOffset, laneId: newLaneId } : item
      );

      setItems(updatedItems);
    };

    const handleRemoveLane = (laneId: UniqueIdentifier) => {
      setLanes((lanes) => lanes.filter((lane) => lane.id !== laneId));
    };

    const collisionDetection: CollisionDetection = (args) => {
      const pointerWithinCollisions = pointerWithin(args);

      if (pointerWithinCollisions.length != 0) {
        return pointerWithinCollisions;
      } else {
        return closestCenter(args);
      }
    };

    return (
      <DndContext
        sensors={sensors}
        modifiers={modifiers}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          style={{
            display: 'inline-grid',
            boxSizing: 'border-box',
            gridAutoFlow: vertical ? 'row' : 'column',
          }}
        >
          <SortableContext
            items={lanes}
            strategy={vertical ? verticalListSortingStrategy : horizontalListSortingStrategy}
          >
            {lanes.map((lane) => {
              const laneItems = items.filter((item) => item.laneId === lane.id);

              return (
                <DroppableLane<TLane, TItem>
                  key={lane.id}
                  data={lane}
                  label={minimal ? undefined : `Column ${lane.id}`}
                  items={laneItems}
                  scrollable={scrollable}
                  style={laneStyle}
                  unstyled={minimal}
                  onRemove={() => handleRemoveLane(lane.id)}
                >
                  {laneItems.map((item, index) => (
                    <DraggableItem
                      data={item}
                      laneId={lane.id}
                      key={index}
                      handle={handle}
                      renderItem={renderItem}
                      wrapperStyle={wrapperStyle}
                    />
                  ))}
                </DroppableLane>
              );
            })}
          </SortableContext>
        </div>
        {createPortal(
          <DragOverlay adjustScale={adjustScale} dropAnimation={dropAnimation}>
            {active ? (
              isLane(active.id) ? (
                <div style={{ color: 'red' }}>{active.id}</div>
              ) : (
                <div style={{ color: 'yellow' }}>{active.id} dragging</div>
              )
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    );
  };

  return Scheduler;
}

export function createSchedulerSystem<
  TLane extends BaseLane = BaseLane,
  TItem extends BaseItem = BaseItem
>() {
  const { SchedulerProvider, useScheduler } = createSchedulerProvider<TLane, TItem>();
  const Scheduler = createScheduler<TLane, TItem>(useScheduler);

  return {
    SchedulerProvider,
    useScheduler,
    Scheduler,
  };
}
