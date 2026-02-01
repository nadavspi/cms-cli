import { createDirectus, authentication, rest } from "@directus/sdk";

const { DIRECTUS_URL, DIRECTUS_USER, DIRECTUS_PASSWORD } = process.env;
if (!DIRECTUS_URL || !DIRECTUS_USER || !DIRECTUS_PASSWORD) {
  console.error("Missing env variable(s)");
  process.exit(1);
}

const initDirectus = async () => {
  const directus = createDirectus<ApiCollections>(DIRECTUS_URL)
    .with(authentication())
    .with(rest());
  await directus.login({
    email: DIRECTUS_USER,
    password: DIRECTUS_PASSWORD,
  });
  return directus;
};

let directusClient: Awaited<ReturnType<typeof initDirectus>> | null = null;
export const getDirectusClient = async () => {
  if (!directusClient) {
    directusClient = await initDirectus();
  }
  return directusClient;
};
