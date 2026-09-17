import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import DogPage from "../dogs/[id]/page";
import { fetchDogById, fetchPubliclyEligibleDogs, normalizeDog } from "../lib/rescueDogs";

vi.mock("../lib/rescueDogs", async (original) => ({
  ...await original<typeof import("../lib/rescueDogs")>(),
  fetchDogById: vi.fn(),
  fetchPubliclyEligibleDogs: vi.fn(),
}));
vi.mock("next/link", () => ({
  default: (props: { href: string; children?: unknown }) => createElement("a", props, props.children as never),
}));

it("keeps Astrid's stable page, explains the unavailable listing and never offers its dead adoption link", async () => {
  const dog = normalizeDog({
    type: "animals", id: "21881216", attributes: { name: "ASTRID" },
    relationships: { orgs: { data: [{ type: "orgs", id: "2707" }] } },
  }, new Map([["orgs:2707", { name: "St. Clair County Animal Adoption Center" }]]));
  vi.mocked(fetchDogById).mockResolvedValue({ dog });
  vi.mocked(fetchPubliclyEligibleDogs).mockResolvedValue({ result: null, reason: "no-eligible-dogs" });
  const html = renderToStaticMarkup(await DogPage({ params: Promise.resolve({ id: dog.id }) }));
  expect(html).toContain("ASTRID’s adoption listing is unavailable");
  expect(html).toContain("This does not tell us whether ASTRID was adopted");
  expect(html).toContain('href="https://www.stclaircountyil.gov/departments/animal-services/adoption"');
  expect(html).toContain("Find more adoptable dogs near you");
  expect(html).not.toContain("astrid-41f09fe4");
  expect(html).not.toContain("View ASTRID&#x27;s adoption page");
});
