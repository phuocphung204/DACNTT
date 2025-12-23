import { createSlice } from "@reduxjs/toolkit";

import { CLIENT_FILTERS } from "#components/variables";

const initialState = {
  activeFilters: (() => {
    const actives = {};
    Object.keys(CLIENT_FILTERS).forEach((key) => {
      actives[key] = false;
    });
    return actives;
  })(),
  filterValues: (() => {
    const values = {};
    Object.keys(CLIENT_FILTERS).forEach((key) => {
      values[key] = CLIENT_FILTERS[key].defaultValue || [];
      if (CLIENT_FILTERS[key].childValues) {
        Object.keys(CLIENT_FILTERS[key].childValues).forEach((childKey) => {
          values[childKey] = {
            parent: CLIENT_FILTERS[key].param,
            pendingParentValue: childKey,
            value: [],
          };
        });
      }
    });
    return values;
  })(),
  filterChilds: (() => {
    const initial = {};
    Object.keys(CLIENT_FILTERS).forEach((optionKey) => {
      const option = CLIENT_FILTERS[optionKey];
      if (option.childValues) {
        const childs = option.childValues;
        Object.keys(childs).forEach(childKey => {
          const child = childs[childKey];
          initial[childKey] = {
            childValues: child,
            childType: childKey,
          }
        });
      }
    });
    return initial;
  })(),
};

const filterSlice = createSlice({
  name: "filter",
  initialState,
  reducers: {
    setActiveState(state, action) {
      const { param, nextActive } = action.payload;
      state.activeFilters[param] = nextActive;
    },
    setValuesState(state, action) {
      const { param, values } = action.payload;
      state.filterValues[param] = values;
    },
    resetFilterValue(state, action) {
      const { param } = action.payload;
      state.filterValues[param] = CLIENT_FILTERS[param].defaultValue || [];
    }
  },
});

export const {
  setActiveState,
  setValuesState,
  resetFilterValue,
} = filterSlice.actions;

export default filterSlice.reducer;