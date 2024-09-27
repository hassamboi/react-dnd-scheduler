import {
  Active,
  CollisionDetection,
  defaultDropAnimationSideEffects,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DropAnimation,
  getFirstCollision,
  KeyboardCoordinateGetter,
  Modifiers,
  MouseSensor,
  rectIntersection,
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
import { FC, useCallback, useMemo, useRef } from 'react';
import { createSnapModifier } from '@dnd-kit/modifiers';
import { findIndexById } from '../utils';
import { ADD_LANE_ID, LANE_TYPE, STEP_SIZE, UNASSIGNED_LANE_ID } from '../constants';
import { DroppableLane, Lane } from '../components/Lane';
import { DraggableItem } from '../components/Item/DraggableItem';
import { createPortal, unstable_batchedUpdates } from 'react-dom';
import { Item } from '../components/Item';

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
    laneId?: UniqueIdentifier | null;
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
    getItemStyles = () => ({}),
    renderItem,
  }) => {
    const { items, lanes, active, setItems, setLanes, setActive, isItem, isLane } = useScheduler();
    const lastOverId = useRef<UniqueIdentifier | null>(null);

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

      if (isActiveLane && over.id !== UNASSIGNED_LANE_ID) {
        setLanes((lanes) => {
          const activeIndex = findIndexById(lanes, active.id);
          const overIndex = findIndexById(lanes, over.id);

          return arrayMove(lanes, activeIndex, overIndex);
        });

        return;
      }

      const activeItem: TItem | undefined = active?.data?.current?.data;

      if (!activeItem) return;

      const newOffset = activeItem.offset + delta.y;

      if (isOverLane && newOffset >= 0) {
        const newLaneId = over.id;

        const updatedItems = items.map((item) =>
          item.id === active.id ? { ...item, offset: newOffset, laneId: newLaneId } : item
        );

        setItems(updatedItems);
      }
    };

    const handleRemoveLane = (laneId: UniqueIdentifier) => {
      setItems((items) =>
        items.map((item) => (item.laneId === laneId ? { ...item, laneId: null } : item))
      );
      setLanes((lanes) => lanes.filter((lane) => lane.id !== laneId));
    };

    function handleAddLane() {
      unstable_batchedUpdates(() => {
        // setLanes((lanes) => [...lanes, newLaneId]);
        // setItems((items) => ({
        //   ...items,
        //   [newLaneId]: [],
        // }));
      });
    }

    // const collisionDetectionStrategy: CollisionDetection = useCallback(
    //   (args) => {
    //     if (active?.id && isLane(active.id)) {
    //       return closestCorners({
    //         ...args,
    //         droppableContainers: args.droppableContainers.filter(
    //           (container) => container.data.current?.type === LANE_TYPE
    //         ),
    //       });
    //     }

    //     const pointerIntersections = pointerWithin(args);
    //     const intersections = pointerIntersections.length
    //       ? pointerIntersections
    //       : closestCorners(args);
    //     const overId = getFirstCollision(intersections, 'id');

    //     if (overId) {
    //       lastOverId.current = overId;
    //       return [{ id: overId }];
    //     }

    //     return lastOverId.current ? [{ id: lastOverId.current }] : [];
    //   },
    //   [active, items]
    // );

    const collisionDetectionStrategy: CollisionDetection = useCallback(
      (args) => {
        const activeRect = args?.active?.rect?.current?.translated;

        if (!activeRect) return [];

        const snappedTop = Math.round(activeRect.top / stepSize) * stepSize;
        const snappedBottom = snappedTop + activeRect.height;

        const laneId = active?.data.current?.data?.laneId;
        const laneItems = items.filter((item) => item.laneId === laneId);

        const isOverlapping = laneItems.some((item) => {
          const itemTop = item.offset;
          const itemBottom = item.offset + 60; /** height */

          return (
            (snappedTop >= itemTop && snappedTop < itemBottom) ||
            (snappedBottom > itemTop && snappedBottom <= itemBottom) ||
            (snappedTop < itemTop && snappedBottom > itemBottom)
          );
        });

        if (!isOverlapping) {
          // Proceed with the default rect intersection to detect valid drop targets
          const intersections = rectIntersection(args);
          const overId = getFirstCollision(intersections, 'id');

          if (overId) {
            lastOverId.current = overId;
            return [{ id: overId }];
          }
        }

        // Fallback to last valid drop location if no valid drop spot is found
        return lastOverId.current ? [{ id: lastOverId.current }] : [];
      },
      [active, items]
    );

    const renderItemDragOverlay = (item: Active) => {
      const data: TItem = item.data.current?.data;

      return (
        <Item
          data={data}
          handle={handle}
          style={{
            ...getItemStyles({
              laneId: data.laneId,
              value: item.data.current?.value,
              isSorting: true,
              isDragging: true,
              isDragOverlay: true,
            }),
          }}
          renderItem={renderItem}
          dragOverlay
        />
      );
    };

    const renderLaneDragOverlay = (lane: Active) => {
      return (
        <Lane label={`Column ${lane.id}`} shadow unstyled={false}>
          {items
            .filter((item) => item.laneId === lane.id)
            .map((item) => (
              <Item
                key={item.id}
                data={item}
                handle={handle}
                style={getItemStyles({
                  laneId: item.laneId,
                  value: item,
                  isDragging: false,
                  isSorting: false,
                  isDragOverlay: false,
                })}
                renderItem={renderItem}
              />
            ))}
        </Lane>
      );
    };

    return (
      <DndContext
        sensors={sensors}
        modifiers={modifiers}
        collisionDetection={collisionDetectionStrategy}
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
          <DroppableLane<BaseLane, TItem>
            key={UNASSIGNED_LANE_ID}
            data={{ id: UNASSIGNED_LANE_ID }}
            label={minimal ? undefined : `Unassigned Items`}
            items={items.filter((item) => !item.laneId || item.laneId === UNASSIGNED_LANE_ID)}
            scrollable={scrollable}
            style={laneStyle}
            unstyled={minimal}
            disableHandle
          >
            {items
              .filter((item) => !item.laneId || item.laneId === UNASSIGNED_LANE_ID)
              .map((item) => (
                <DraggableItem
                  data={item}
                  key={item.id}
                  handle={handle}
                  wrapperStyle={wrapperStyle}
                />
              ))}
          </DroppableLane>
          <SortableContext
            items={lanes}
            strategy={vertical ? verticalListSortingStrategy : horizontalListSortingStrategy}
          >
            {lanes
              .filter((lane) => lane.id !== UNASSIGNED_LANE_ID && lane.id !== ADD_LANE_ID)
              .map((lane) => {
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
                    {laneItems.map((item) => (
                      <DraggableItem<TItem>
                        data={item}
                        key={item.id}
                        handle={handle}
                        renderItem={renderItem}
                        wrapperStyle={wrapperStyle}
                      />
                    ))}
                  </DroppableLane>
                );
              })}
            {minimal ? undefined : (
              <DroppableLane
                key={ADD_LANE_ID}
                data={{ id: ADD_LANE_ID }}
                items={[]}
                onClick={handleAddLane}
                placeholder
              >
                + Add column
              </DroppableLane>
            )}
          </SortableContext>
        </div>
        {createPortal(
          <DragOverlay adjustScale={adjustScale} dropAnimation={dropAnimation}>
            {active
              ? isLane(active.id)
                ? renderLaneDragOverlay(active)
                : renderItemDragOverlay(active)
              : null}
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
