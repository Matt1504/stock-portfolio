export class GraphData {
  name: string;
  value: number;
  value_1: number | undefined;
  label: string | undefined;

  constructor(
    name: string,
    value: number,
    value_1: number | undefined,
    label: string | undefined
  ) {
    this.name = name;
    this.value = value;
    this.value_1 = value_1;
    this.label = label;
  }
}
