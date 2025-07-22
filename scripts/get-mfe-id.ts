import { readFileSync } from "fs";
import { join } from "path";

const packageName = JSON.parse(
    readFileSync(join(__dirname, '../package.json')).toString()
).name;
console.log(packageName);