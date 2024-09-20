import { Lane, LaneProps } from '.';
import { BaseItem, BaseLane } from '../../types';
import { AnimateLayoutChanges, defaultAnimateLayoutChanges, useSortable } from '@dnd-kit/sortable';
import { LANE_TYPE } from '../../constants';
import { CSS } from '@dnd-kit/utilities';

export type Props<
  TLane extends BaseLane = BaseLane,
  TItem extends BaseItem = BaseItem
> = LaneProps & {
  disabled?: boolean;
  data: TLane;
  items: TItem[];
  style?: React.CSSProperties;
};

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

export const DroppableLane = <
  TLane extends BaseLane = BaseLane,
  TItem extends BaseItem = BaseItem
>({
  children,
  data,
  columns = 1,
  items,
  style,
  disabled,
  ...props
}: Props<TLane, TItem>) => {
  const { active, attributes, isDragging, listeners, over, setNodeRef, transition, transform } =
    useSortable({
      id: data.id,
      data: {
        type: LANE_TYPE,
        children: items,
        data,
      },
      animateLayoutChanges,
    });
  const isOverLane = over
    ? (data.id === over.id && active?.data.current?.type !== LANE_TYPE) ||
      items.some((item) => item.id === over.id)
    : false;

  return (
    <Lane
      ref={disabled ? undefined : setNodeRef}
      style={{
        ...style,
        transition,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : undefined,
      }}
      hover={isOverLane}
      handleProps={{
        ...attributes,
        ...listeners,
      }}
      columns={columns}
      {...props}
    >
      {children}
    </Lane>
  );
};
