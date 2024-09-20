import { UniqueIdentifier } from '@dnd-kit/core';
import { Sortable } from '../types';

export const isInList = (list: Sortable[], id: UniqueIdentifier) => {
  return list.some((value) => value.id === id);
};

export const findIndexById = (list: Sortable[], id: UniqueIdentifier) => {
  return list.findIndex((item) => item.id === id);
};

export const findById = (list: Sortable[], id: UniqueIdentifier) => {
  return list.find((item) => item.id === id);
};
