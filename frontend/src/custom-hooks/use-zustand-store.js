import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export const useRenderCountStore = create(
  immer((set, get) => ({
    activeComponents: [],
    addComponent: (name) => set((state) => {
      state.activeComponents.push(name);
    }),
    removeComponent: (name) => set((state) => {
      state.activeComponents = state.activeComponents.filter(c => c !== name);
    }),
    getComponentIndex: (name) => get().activeComponents.indexOf(name)
  }))
);
/**
 * Store quản lý các hàm uploader được đăng ký
 */
export const useUploadersRegistry = create(
  immer((set, get) => ({
    uploadersFuncs: {},
    setUploader: (key, uploader) => set((state) => {
      state.uploadersFuncs[key] = uploader;
    }),
    getUploader: (key) => get().uploadersFuncs[key],
    getUploaderFuncs: () => Object.values(get().uploadersFuncs),
    removeUploader: (key) => set((state) => {
      delete state.uploadersFuncs[key];
    }),
  }))
);

// có thêm cơ chế stack của các bodycomponents [{title, component, props}, {...}]
export const userModalDialogStore = create(
  immer((set, get) => ({
    show: false,
    title: "",
    bodyComponent: null,
    bodyProps: {},
    formValues: {},
    stack: [], // [{title, component, props}, {...}]
    size: "lg",
    timeOutId: null,
    buttons: [],
    setShow: (value) => set((state) => {
      state.show = value;
      if (state.timeOutId) {
        clearTimeout(state.timeOutId);
        state.timeOutId = null;
      }
      if (!value) {
        const timeoutId = setTimeout(() => {
          set((draft) => {
            draft.stack = [];
            draft.title = "";
            draft.bodyComponent = null;
            draft.bodyProps = {};
            draft.size = "lg";
            draft.buttons = [];
            draft.timeOutId = null;
          });
        }, 300);
        state.timeOutId = timeoutId;
      } else if (value && state.stack.length === 0 && state.bodyComponent) {
        state.stack.push({
          title: state.title,
          bodyComponent: state.bodyComponent,
          bodyProps: state.bodyProps,
          size: state.size,
          buttons: state.buttons,
        });
      }
    }),
    setTitle: (title) => set((state) => {
      state.title = title;
      if (state.stack.length > 0) {
        state.stack[state.stack.length - 1].title = title;
      }
    }),
    setBodyComponent: (component) => set((state) => {
      state.bodyComponent = component;
      if (state.stack.length > 0) {
        state.stack[state.stack.length - 1].bodyComponent = component;
      }
    }),
    setBodyProps: (props) => set((state) => {
      state.bodyProps = props;
      if (state.stack.length > 0) {
        state.stack[state.stack.length - 1].bodyProps = props;
      }
    }),
    setSize: (size) => set((state) => {
      state.size = size;
      if (state.stack.length > 0) {
        state.stack[state.stack.length - 1].size = size;
      }
    }),
    setButtons: (buttons) => set((state) => {
      state.buttons = buttons;
      if (state.stack.length > 0) {
        state.stack[state.stack.length - 1].buttons = buttons;
      }
    }),
    push: ({ title, bodyComponent, bodyProps = {}, size, buttons }) => set((state) => {
      const entry = {
        title,
        bodyComponent,
        bodyProps,
        size: size || state.size,
        buttons: buttons || state.buttons,
      };
      state.stack.push(entry);
      state.title = entry.title;
      state.bodyComponent = entry.bodyComponent;
      state.bodyProps = entry.bodyProps;
      state.size = entry.size;
      state.buttons = entry.buttons;
      state.show = true;
    }),
    pop: () => set((state) => {
      state.stack.pop();
      const current = state.stack[state.stack.length - 1];
      if (current) {
        state.title = current.title;
        state.bodyComponent = current.bodyComponent;
        state.bodyProps = current.bodyProps || {};
        state.size = current.size || state.size;
        state.buttons = current.buttons || state.buttons;
        state.show = true;
      } else { // TODO: cần setTimeout để đóng mượt hơn
        state.show = false;
        state.title = "";
        state.bodyComponent = null;
        state.bodyProps = {};
        state.size = "lg";
        state.buttons = [];
      }
    }),
    reset: () => set((state) => {
      state.show = false;
      if (state.timeOutId) {
        clearTimeout(state.timeOutId);
        state.timeOutId = null;
      }
      const timeoutId = setTimeout(() => {
        set((draft) => {
          draft.stack = [];
          draft.title = "";
          draft.bodyComponent = null;
          draft.bodyProps = {};
          draft.size = "lg";
          draft.buttons = [];
          draft.timeOutId = null;
        });
      }, 300);
      state.timeOutId = timeoutId;
    }),
  }))
);

export { useShallow } from "zustand/shallow";