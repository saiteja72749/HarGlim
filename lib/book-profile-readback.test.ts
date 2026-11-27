import { beforeEach, describe, expect, it, vi } from "vitest";
import api, { getPublic } from "@/lib/api";
import { UnconfirmedWriteError } from "@/lib/api-error";
import { verifyBookWrite } from "@/lib/admin-book-readback";
import { savePublicAuthorProfile } from "@/lib/author-profile";

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), put: vi.fn() },
  getPublic: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

describe("book language readback", () => {
  const book = { _id: "book-id", title: "Book title", status: "published", language: "Telugu", slug: "book-title" };

  it("requires the admin and public APIs to return the same persisted language", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { book } } });
    vi.mocked(getPublic).mockResolvedValue({ data: { data: book } } as Awaited<ReturnType<typeof getPublic>>);
    await expect(verifyBookWrite(book._id, book)).resolves.toEqual(book);
    expect(api.get).toHaveBeenCalledWith("/admin/books/book-id", { cache: "no-store" });
    expect(getPublic).toHaveBeenCalledWith("/books/book-title");
  });

  it("reports an unconfirmed save when the public response omits language", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: book } });
    vi.mocked(getPublic).mockResolvedValue({ data: { data: { ...book, language: undefined } } } as Awaited<ReturnType<typeof getPublic>>);
    await expect(verifyBookWrite(book._id, book)).rejects.toBeInstanceOf(UnconfirmedWriteError);
  });

  it("checks edited inventory and discount fields against the admin readback", async () => {
    const draft = { ...book, status: "draft", reservedStock: 0, discountPrice: 150 };
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { data: { ...draft, discountPrice: 200 } } })
      .mockResolvedValueOnce({ data: { data: draft } });
    await expect(verifyBookWrite(book._id, draft)).rejects.toBeInstanceOf(UnconfirmedWriteError);
    await expect(verifyBookWrite(book._id, draft)).resolves.toEqual(draft);
    expect(getPublic).not.toHaveBeenCalled();
  });

  it("checks the saved relationship returned as either an ID or a populated author", async () => {
    const expected = { ...book, status: "draft", author: "author-id" };
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { data: { ...expected, author: "old-author-id" } } })
      .mockResolvedValueOnce({ data: { data: { ...expected, author: { _id: expected.author } } } });
    await expect(verifyBookWrite(book._id, expected)).rejects.toBeInstanceOf(UnconfirmedWriteError);
    await expect(verifyBookWrite(book._id, expected)).resolves.toMatchObject({ author: { _id: expected.author } });
  });
});

describe("author profile readback", () => {
  const name = "Author name";
  const bio = "Author biography";
  const profilePicture = "https://example.com/author.webp";

  it("checks the public author ID and photo with a fresh anonymous read", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } });
    vi.mocked(api.get).mockResolvedValue({ data: { data: { _id: "author-id", name, bio, profilePicture } } });
    await expect(savePublicAuthorProfile("author-id", { name, bio, profilePicture })).resolves.toMatchObject({ name, bio, profilePicture });
    expect(api.get).toHaveBeenCalledWith("/authors/author-id", { publicRead: true, cache: "no-store" });
  });

  it("reports a failed refresh separately from an acknowledged save", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } });
    vi.mocked(api.get).mockRejectedValue(new Error("Network unavailable"));
    await expect(savePublicAuthorProfile("author-id", { name, bio, profilePicture })).rejects.toBeInstanceOf(UnconfirmedWriteError);
    expect(api.put).toHaveBeenCalledTimes(1);
  });
});
