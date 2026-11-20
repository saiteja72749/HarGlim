/** Category identity and response parsing shared by forms and maintenance tools. */
export interface BackendCategory {
  _id: string;
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  active?: boolean;
  isActive?: boolean;
  featured?: boolean;
  sortOrder?: number;
  bookCount?: number;
}

export const categoryNameKey = (name: string) => name.normalize("NFKC").trim().toLocaleLowerCase("en");
export const categoryIsActive = (category: BackendCategory) => category.active !== false && category.isActive !== false;
export const findDuplicateCategory = (categories: BackendCategory[], name: string, exceptId?: string) =>
  categories.find((category) => category._id !== exceptId && categoryNameKey(category.name) === categoryNameKey(name));

const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" ? value as Record<string, unknown> : {};

export function parseCategoryPage(value: unknown): { categories: BackendCategory[]; pages?: number } {
  const root = object(value);
  if (root.success === false) throw new Error("The backend rejected the category request.");
  const data = object(root.data);
  const rows = [data.categories, root.categories, root.data, value].find(Array.isArray);
  if (!rows) throw new Error("The backend returned an invalid category list.");
  const categories = rows.map((row: unknown) => {
    const category = object(row);
    const id = category._id ?? category.id;
    if (typeof id !== "string" || !id || typeof category.name !== "string" || !category.name.trim()) {
      throw new Error("The backend returned a category without an identifier or name.");
    }
    return { ...category, _id: id, id, name: category.name } as BackendCategory;
  });
  const pagination = object(root.pagination ?? data.pagination);
  const pages = pagination.pages ?? pagination.totalPages;
  if (pages !== undefined && (!Number.isInteger(pages) || Number(pages) < 0)) {
    throw new Error("The backend returned invalid category pagination.");
  }
  return { categories, pages: typeof pages === "number" ? pages : undefined };
}

export function resolveCategoryId(categories: BackendCategory[], input: string): string | undefined {
  const key = categoryNameKey(input);
  if (!key) return undefined;
  return categories.find((category) => category._id === input.trim() || categoryNameKey(category.name) === key ||
    (category.slug && categoryNameKey(category.slug) === key))?._id;
}
