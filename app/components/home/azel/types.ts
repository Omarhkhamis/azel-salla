/** A home block's merchant values; every id in `twilight.json` arrives as a key here. */
export interface BlockProps<T> {
  data: T & { position?: number; priority?: boolean; [key: string]: unknown };
}
