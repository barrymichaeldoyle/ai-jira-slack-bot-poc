// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logger(message: string, type: 'info' | 'error' | 'warn' = 'info', ...args: any[]) {
  console[type](message, ...args);
}
