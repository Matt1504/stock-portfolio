export interface SelectInput {
    key: string,
    label: string,
    value: string,
}

export type HoldingDetail = {
    title: string;
    value: number | string;
    prefix: string | undefined;
    colour: string;
    precision: number | undefined;
  };
