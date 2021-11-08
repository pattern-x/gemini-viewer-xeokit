//export other callback function type
export type EmptyCallbackType = () => void;
export type CallbackType<T, U> = (event: T) => U;
export type CallbackRetureVoidType<T> = CallbackType<T, void>;
