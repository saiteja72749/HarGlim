/** Preset for explicit admin imports. The backend supplies all catalog options. */
export const INITIAL_CATEGORY_NAMES = [
  "Academic", "Adventure", "Agriculture", "Anthology", "Art & Photography",
  "Artificial Intelligence", "Astrology", "Autobiography", "Ayurveda", "Biography",
  "Business & Entrepreneurship", "Children's Books", "Comics & Graphic Novels",
  "Communication Skills", "Computer & Technology", "Cooking & Food", "Crime & Mystery",
  "Culture & Heritage", "Drama & Plays", "Education & Textbooks", "Engineering",
  "Environment & Nature", "Essays", "Fantasy", "Fiction", "Finance & Investment",
  "Folklore", "Health & Wellness", "Historical Fiction", "History", "Horror",
  "Inspirational", "Journalism", "Law", "Literary Fiction", "Literature", "Mathematics",
  "Memoir", "Mental Health & Psychology", "Motivational", "Music & Dance", "Mythology",
  "Non-Fiction", "Parenting & Family", "Personal Development", "Philosophy", "Poetry",
  "Politics & Government", "Programming & Software", "Religion & Spirituality",
  "Research & Reference", "Romance", "Science", "Science Fiction", "Self-Help",
  "Short Stories", "Social Issues", "Sociology", "Sports & Fitness", "Thriller & Suspense",
  "Travel & Tourism", "Young Adult", "Other",
];

/** @param {string} name */
const key = (name) => name.normalize("NFKC").trim().toLocaleLowerCase("en").replace(/[’']/g, "").replace(/[-\s]+/g, " ");
// Conservative collision detection. The backend remains authoritative for slug generation.
/** @param {string} name */
export const categorySlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** @param {{ _id: string; name: string; slug?: string; active?: boolean; isActive?: boolean }[]} existing */
export function planCategorySeed(existing) {
  const present = [], missing = [], conflicts = [];
  for (const name of INITIAL_CATEGORY_NAMES) {
    const found = existing.find((category) => key(category.name) === key(name)) ??
      (name === "Children's Books" ? existing.find((category) => key(category.name) === "children books") : undefined);
    if (found) { present.push({ name, existingName: found.name, id: found._id, active: found.active !== false && found.isActive !== false }); continue; }
    const collision = existing.find((category) => category.slug === categorySlug(name));
    if (collision) conflicts.push({ name, existingName: collision.name, id: collision._id });
    else missing.push(name);
  }
  return { present, missing, conflicts };
}
