import fs from 'node:fs';

export async function fileExists(filePath: fs.PathLike): Promise<boolean> {
  try {
    return (await fs.promises.stat(filePath)).isFile();
  } catch {
    return false;
  }
}
