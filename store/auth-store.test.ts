import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "./auth-store";

const context = (role: string, profilePicture: string | null = null) =>
  ({
    user: { id: "U1", _id: "U1", name: "A", email: "a@b.c", role, isActive: true, profilePicture, createdAt: "" },
    capabilities: {},
    states: {},
  }) as any;

describe("setUserContext", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { _id: "U1", name: "A", email: "a@b.c", role: "author" } as any, userContext: null });
  });

  it("keeps the same user object when nothing changed, so pages do not refetch in a loop", () => {
    const before = useAuthStore.getState().user;
    useAuthStore.getState().setUserContext(context("author"));
    expect(useAuthStore.getState().user).toBe(before);
    useAuthStore.getState().setUserContext(context("author"));
    expect(useAuthStore.getState().user).toBe(before);
    expect(useAuthStore.getState().userContext?.user.role).toBe("author");
  });

  it("gives a new user object when the role or photo changed, so pages do reload", () => {
    const before = useAuthStore.getState().user;
    useAuthStore.getState().setUserContext(context("admin"));
    const afterRole = useAuthStore.getState().user;
    expect(afterRole).not.toBe(before);
    expect(afterRole?.role).toBe("admin");

    useAuthStore.getState().setUserContext(context("admin", "https://img/me.jpg"));
    expect(useAuthStore.getState().user).not.toBe(afterRole);
    expect(useAuthStore.getState().user?.profileImage).toBe("https://img/me.jpg");
  });

  it("stays signed out when there is no user", () => {
    useAuthStore.setState({ user: null });
    useAuthStore.getState().setUserContext(context("author"));
    expect(useAuthStore.getState().user).toBeNull();
  });
});
