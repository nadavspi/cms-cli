const processList = (list) => {
  const items: object[] = [];

  for (const listItem of list.children) {
    if (listItem.type !== "listItem") {
      continue;
    }

    const content = listItem.children
      .filter((child) => child.type === "paragraph")
      .flatMap((paragraph) => paragraph.children)
      .filter((child) => child.type === "text")
      .map((child) => child.value)
      .join("");

    let note;
    const nestedList = listItem.children.find((child) => child.type === "list");
    if (nestedList) {
      const noteText = nestedList.children
        .filter((child) => child.type === "listItem")
        .flatMap((item) => item.children)
        .filter((child) => child.type === "paragraph")
        .flatMap((paragraph) => paragraph.children)
        .filter((child) => child.type === "text")
        .map((child) => child.value)
        .join("");

      note = noteText.replace(/^Reader's note:\s*/i, "");
    }

    if (content) {
      items.push({ content, note });
    }
  }
  return items;
};

export const getHighlights = (tree) => {
  const highlights: object[] = [];
  let inHighlights = false;

  for (const node of tree.children) {
    if (node.type === "heading") {
      const text = node.children
        .filter((child) => child.type === "text")
        .map((child) => child.value)
        .join("");

      inHighlights = text === "Highlights";
    }

    if (inHighlights && node.type === "list") {
      const highlight = processList(node);
      if (highlight) {
        highlights.push(...highlight);
      }
    }
  }

  console.log(`- Parsed ${highlights.length} highlights`);
  return highlights;
};

export default getHighlights;
