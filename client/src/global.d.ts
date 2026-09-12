declare module "js-sha256" {
  export interface Hash {
    update(message: any): this;
    hex(): string;
    array(): number[];
    digest(): number[];
    arrayBuffer(): ArrayBuffer;
  }
  export const sha256: {
    (message: any): string;
    create(): Hash;
    hex(message: any): string;
  };
}
