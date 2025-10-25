
export interface DataPoint {
  x: number;
  y: number;
}

export enum RegularizationType {
  None = 'none',
  L1 = 'l1',
  L2 = 'l2',
}
