import {
  createItem,
  createItems,
  deleteItems,
  importFile,
  readItem,
  readItems,
  updateFile,
} from "@directus/sdk";
import slugify from "@sindresorhus/slugify";
import matter from "gray-matter";
import { fromMarkdown } from "mdast-util-from-markdown";
import fs from "node:fs/promises";
import path from "node:path";
import { getDirectusClient } from "./src/directusClient";
import getHighlights from "./src/getHighlights";

const directus = await getDirectusClient();

const getSlug = (data) => {
  return slugify([data.author, data.title].join("_"));
};

const setFrontmatter = (filename, data, content, bookId) => {
  const nextData = { ...data, directusId: bookId };
  console.log(`- Setting frontmatter directusId: ${bookId}`);
  fs.writeFile(filename, matter.stringify(content, nextData));
}

const processFile = async (filename) => {
  if (filename.includes('Instapaper')) {
    console.log(`\n\nSkipping ${path.basename(filename)}`);
    return;
  }
  console.log(`\n\nProcessing ${path.basename(filename)}`);

  try {
    const file = await fs.readFile(filename, {
      encoding: "utf8",
    });
    const { data, content } = matter(file);
    const tree = fromMarkdown(content);
    const highlights = getHighlights(tree);

    if (!data.directusId) {
      console.log("- No directusId in frontmatter. Checking by slug.");
      const existingItem = await directus.request(
        readItems("books", { filter: { slug: { _eq: getSlug(data) } } }),
      );

      if (existingItem?.length) {
        console.log('- Found existing item');
        const { id: bookId } = existingItem[0];
        await setFrontmatter(filename, data, content, bookId);
        processFile(filename);

        return;
      } 

      console.log("- Creating new book");
      const { id: bookId } = await createBook(data, content);

      setFrontmatter(filename, data, content, bookId);
      createHighlights(bookId, highlights);
    } else {
      console.log(`- Updating ${data.directusId}`);
      updateBook(data, content, highlights);
    }
  } catch (err) {
    console.error(err);
  }
};

const createHighlights = async (bookId, rawHighlights) => {
  const highlights = rawHighlights.map((highlight) => ({
    ...highlight,
    book_id: bookId,
  }));

  console.log(`- Creating ${highlights.length} highlights`);
  return directus.request(createItems("highlights", highlights));
};

const uploadCover = async (data, content) => {
  const coverLink = content.match(/^!\[\]\((https:\/\/[^\)]+)\)/);
  if (!coverLink) {
    return;
  }

  const coverUrl: string = coverLink[1];
  if (coverUrl.includes("default-book-icon")) {
    console.log("- Skipping default cover");
    return;
  }

  try {
    console.log(`- Importing cover from ${coverUrl}`);
    const { filename_download: originFilename, id } = await directus.request(
      importFile(coverUrl, {
        title: data.title,
        folder: "56ddc120-0261-45cb-b1a0-60e39e56935b",
        tags: ["Book cover"],
      }),
    );

    const filename_download = `${getSlug(data)}${path.extname(originFilename)}`;
    console.log(`- Rename cover to ${filename_download}`);
    directus.request(updateFile(id, { filename_download }));

    return id;
  } catch (err) {
    console.error(err);
  }
};

const getDate = (date) => {
  try {
    return new Date(date).toISOString();
  } catch {
    console.log("Invalid date");
    return new Date().toISOString();
  }
};

const createBook = async (data, content) => {
  const { title, author, dateUpdated } = data;
  const slug = getSlug(data);

  const item = {
    title,
    author,
    slug,
    cover: await uploadCover(data, content),
    date_created: getDate(dateUpdated),
  };

  return directus.request(createItem("books", item));
};

const updateBook = async (data, content, highlights) => {
  try {
    const { directusId: bookId } = data;

    const { highlights: currentHighlights } = await directus.request(
      readItem("books", bookId),
    );
    if (currentHighlights.length === highlights.length) {
      console.log("- Skipping highlights: same number in file and directus");
    } else {
      console.log("- Deleting highlights");
      await directus.request(
        deleteItems("highlights", { filter: { book_id: { _eq: bookId } } }),
      );
      createHighlights(bookId, highlights);
    }
  } catch (err) {
    console.error(err);
  }
};

const processFiles = async (folderPath) => {
  const isFile = async (filename) => {
    const item = await fs.lstat(filename);
    return item.isFile();
  };

  const items = await fs.readdir(folderPath);
  const files = items
    .map((filename) => {
      return path.join(folderPath, filename);
    })
    .filter((item) => path.extname(item).toLowerCase() === ".md")
    .filter(isFile);

  for (const file of files.slice(450, 550)) {
    await processFile(file);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('\nDone');
};


const folderPath =
  "/Users/nadavspi/Documents/Archive/10-19 Personal documents/18 Notes/reading/books";

processFiles(folderPath);
