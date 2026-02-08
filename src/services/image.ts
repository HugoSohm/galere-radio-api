import fs from 'fs';

/**
 * Downloads an image from a URL and saves it to a local file.
 */
export const downloadImage = async (url: string, filepath: string): Promise<void> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(buffer));
};
