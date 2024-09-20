import { UniqueIdentifier } from '@dnd-kit/core';

export type BaseLane = { id: UniqueIdentifier };
export type BaseItem = { id: UniqueIdentifier; offset: number; laneId?: UniqueIdentifier | null };
export type Sortable = BaseLane | BaseItem;
