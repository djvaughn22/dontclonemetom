// The prefilled email a visitor can send a rescue about one dog. It names the
// dog, links her own listing when there is one, and gives her RescueGroups
// listing id so the rescue knows exactly which dog — rescues often have two
// with the same name. It asks a plain question and promises nothing on the
// rescue's behalf. Client-safe: pure function, no env.

type ContactDog = { id: string; name: string; org: string; email: string | null };
type ContactDestination = { type: string; url: string } | null | undefined;

export function rescueEmailHref(dog: ContactDog, destination?: ContactDestination): string {
  const name = dog.name.trim() || "this dog";
  const body = [
    `Hi ${dog.org.trim() || "there"},`,
    "",
    `I found ${name} on DontCloneMeTom.com and I'd like to learn more about adopting ${name}. What are the next steps?`,
    "",
    ...(destination?.type === "exact-dog" ? [`${name}'s listing: ${destination.url}`] : []),
    `RescueGroups listing ID: ${dog.id}`,
    "",
    "Thank you!",
  ].join("\n");
  return `mailto:${dog.email ?? ""}?subject=${encodeURIComponent(`Asking about ${name}`)}&body=${encodeURIComponent(body)}`;
}
