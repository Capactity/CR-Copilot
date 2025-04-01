import fs from 'fs';
import path from 'path';

const isDevelopment = process.env.NODE_ENV === "development";
const configPath = path.resolve(process.cwd(), isDevelopment ? "assets/config.json" : "dist/assets/config.json");
export const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));