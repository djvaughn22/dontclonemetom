import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const buildDogOfTheDay = vi.fn();

vi.mock("../../../lib/dogOfTheDay", () => ({
  buildDogOfTheDay: (...args: unknown[]) => buildDogOfTheDay(...args),
  dogCityLabel: (dog: { city: string }) => dog.city,
}));

vi.mock("../../../lib/dailySocialCore", () => ({
  chicagoDateKey: () => "2026-08-23",
}));

async function callGet(url: string) {
  const { GET } = await import("../route");
  return GET(new NextRequest(url));
}

describe("GET /api/dog-of-the-day — offset drives the homepage Spin control", () => {
  it("passes offset 0 when the query param is absent (today's normal pick)", async () => {
    buildDogOfTheDay.mockResolvedValueOnce({
      dog: { id: "1", name: "Billy", photo: null, org: "Rescue", city: "STL" },
      post: { pagePath: "/dogs/1" },
    });

    await callGet("https://dontclonemetom.com/api/dog-of-the-day");

    expect(buildDogOfTheDay).toHaveBeenCalledWith("2026-08-23", { offset: 0 });
  });

  it("forwards a positive offset from a spin request straight to the selection engine", async () => {
    buildDogOfTheDay.mockResolvedValueOnce({
      dog: { id: "2", name: "Scout", photo: null, org: "Rescue", city: "STL" },
      post: { pagePath: "/dogs/2" },
    });

    await callGet("https://dontclonemetom.com/api/dog-of-the-day?offset=3");

    expect(buildDogOfTheDay).toHaveBeenCalledWith("2026-08-23", { offset: 3 });
  });

  it("never passes a negative or garbage offset through", async () => {
    buildDogOfTheDay.mockResolvedValueOnce({
      dog: { id: "3", name: "Nora", photo: null, org: "Rescue", city: "STL" },
      post: { pagePath: "/dogs/3" },
    });

    await callGet("https://dontclonemetom.com/api/dog-of-the-day?offset=-5");
    expect(buildDogOfTheDay).toHaveBeenCalledWith("2026-08-23", { offset: 0 });

    buildDogOfTheDay.mockResolvedValueOnce({
      dog: { id: "3", name: "Nora", photo: null, org: "Rescue", city: "STL" },
      post: { pagePath: "/dogs/3" },
    });
    await callGet("https://dontclonemetom.com/api/dog-of-the-day?offset=notanumber");
    expect(buildDogOfTheDay).toHaveBeenCalledWith("2026-08-23", { offset: 0 });
  });

  it("fails gracefully (dog: null) when the ring runs out at this offset, rather than throwing", async () => {
    buildDogOfTheDay.mockRejectedValueOnce(new Error("no eligible dog found near 63040"));

    const res = await callGet("https://dontclonemetom.com/api/dog-of-the-day?offset=999");
    const json = await res.json();

    expect(json.dog).toBeNull();
    expect(json.reason).toContain("no eligible dog");
  });
});
