import {
  updateItem
} from "@directus/sdk";
import matter from "gray-matter";
import fs from "node:fs/promises";
import readline from "node:readline";
import { getDirectusClient } from "./src/directusClient";

const { argv } = process;
if (argv.length < 3) {
  console.error("You must pass in the file");
  process.exit(1);
}

const update = async () => {
  try {
    const file = await fs.readFile(argv[2], {
      encoding: "utf8",
    });
    const { data, content } = matter(file);
    if (!data.directusId) {
      throw new Error("Frontmatter missing id");
    }

    const filename = argv[2].split("18 Notes/");

    const directus = await getDirectusClient();
    return await directus.request(
      updateItem("block_markdown", data.directusId, {
        content,
        filename: filename[filename.length - 1],
      }),
    );
  } catch (err) {
    console.error(err);
    await prompt();
  }
};

const prompt = (): Promise<void> => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("\nPress Enter to update again, or Ctrl+C to exit ", () => {
      rl.close();
      resolve();
    });
  });
};

const run = async () => {
  while (true) {
    try {
      await update();
      console.log("\nDone");
      await prompt();
    } catch (err) {
      console.error("Error during update:", err);
      await prompt();
    }
  }
};

run();
