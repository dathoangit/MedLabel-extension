declare module 'crx3' {
  type Crx3Options = {
    keyPath: string;
    crxPath: string;
    zipPath?: string;
  };

  export default function crx3(
    files: string[],
    options: Crx3Options
  ): Promise<void>;
}
