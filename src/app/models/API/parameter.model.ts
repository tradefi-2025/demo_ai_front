

export interface Parameter {
  defaultValue: string | number | boolean | null,
  description: string;
  minValue: number | null,
  maxValue: number | null,
  type: string,
  enumValues?: string[],
  fileName?: string,
  required : boolean
}
