// Dog Identity Engine — the inspiration lexicon.
//
// This is DATA, and it is deliberately wide: the generator composes names
// from patterns, so the variety comes from combinations, not from a small
// fixed list. Famous names here are TRANSFORMATION SOURCES for wordplay —
// the engine never outputs a real person's full name verbatim, and results
// that keep a real surname are honestly labeled for manual review before
// any commercial use.
//
// Adding a sport / lane: add entries tagged with the lane below — nothing
// else changes. Adding a naming pattern: see patterns in engine.ts.

import type { InspirationLane } from "./types";

/** A famous-name wordplay source. `real` = a real person (stricter rights). */
export type FamousSource = {
  first: string;
  last: string;
  lane: InspirationLane;
  archetype: string;
  real: boolean;
};

export const FAMOUS_SOURCES: FamousSource[] = [
  // celebrities / actors
  { first: "Taylor", last: "Swift", lane: "musicians", archetype: "pop icon", real: true },
  { first: "Dolly", last: "Parton", lane: "musicians", archetype: "country legend", real: true },
  { first: "Elvis", last: "Presley", lane: "musicians", archetype: "rock legend", real: true },
  { first: "Aretha", last: "Franklin", lane: "musicians", archetype: "soul queen", real: true },
  { first: "Johnny", last: "Cash", lane: "musicians", archetype: "outlaw balladeer", real: true },
  { first: "Beyonce", last: "Knowles", lane: "musicians", archetype: "stage headliner", real: true },
  { first: "Willie", last: "Nelson", lane: "musicians", archetype: "road troubadour", real: true },
  { first: "Stevie", last: "Wonder", lane: "musicians", archetype: "keyboard genius", real: true },
  { first: "Keanu", last: "Reeves", lane: "actors", archetype: "quiet action hero", real: true },
  { first: "Meryl", last: "Streep", lane: "actors", archetype: "award collector", real: true },
  { first: "Denzel", last: "Washington", lane: "actors", archetype: "commanding lead", real: true },
  { first: "Harrison", last: "Ford", lane: "actors", archetype: "reluctant adventurer", real: true },
  { first: "Sandra", last: "Bullock", lane: "actors", archetype: "america's sweetheart", real: true },
  { first: "Morgan", last: "Freeman", lane: "actors", archetype: "the narrator", real: true },
  { first: "Tom", last: "Hanks", lane: "actors", archetype: "everyman hero", real: true },
  { first: "Emma", last: "Stone", lane: "actors", archetype: "comedy lead", real: true },
  { first: "Oprah", last: "Winfrey", lane: "celebrity", archetype: "talk-show royalty", real: true },
  { first: "Martha", last: "Stewart", lane: "celebrity", archetype: "household perfectionist", real: true },
  { first: "Gordon", last: "Ramsay", lane: "celebrity", archetype: "kitchen commander", real: true },
  { first: "David", last: "Attenborough", lane: "broadcasters", archetype: "nature narrator", real: true },
  // historical
  { first: "Abraham", last: "Lincoln", lane: "historical", archetype: "steady statesman", real: true },
  { first: "Winston", last: "Churchill", lane: "historical", archetype: "bulldog statesman", real: true },
  { first: "Amelia", last: "Earhart", lane: "historical", archetype: "fearless aviator", real: true },
  { first: "Leonardo", last: "Vinci", lane: "historical", archetype: "renaissance mind", real: true },
  { first: "Cleopatra", last: "Philopator", lane: "historical", archetype: "ancient royalty", real: true },
  { first: "Napoleon", last: "Bonaparte", lane: "historical", archetype: "small general", real: true },
  { first: "Teddy", last: "Roosevelt", lane: "historical", archetype: "rough rider", real: true },
  // football
  { first: "Tom", last: "Brady", lane: "football", archetype: "quarterback", real: true },
  { first: "Patrick", last: "Mahomes", lane: "football", archetype: "quarterback", real: true },
  { first: "Jerry", last: "Rice", lane: "football", archetype: "wide receiver", real: true },
  { first: "Barry", last: "Sanders", lane: "football", archetype: "running back", real: true },
  { first: "Walter", last: "Payton", lane: "football", archetype: "running back", real: true },
  { first: "Deion", last: "Sanders", lane: "football", archetype: "shutdown corner", real: true },
  { first: "Travis", last: "Kelce", lane: "football", archetype: "tight end", real: true },
  // basketball
  { first: "Michael", last: "Jordan", lane: "basketball", archetype: "clutch scorer", real: true },
  { first: "LeBron", last: "James", lane: "basketball", archetype: "all-around force", real: true },
  { first: "Stephen", last: "Curry", lane: "basketball", archetype: "long-range shooter", real: true },
  { first: "Shaquille", last: "O'Neal", lane: "basketball", archetype: "unstoppable center", real: true },
  { first: "Caitlin", last: "Clark", lane: "basketball", archetype: "logo shooter", real: true },
  { first: "Kevin", last: "Durant", lane: "basketball", archetype: "smooth scorer", real: true },
  // baseball
  { first: "Babe", last: "Ruth", lane: "baseball", archetype: "slugger", real: true },
  { first: "Jackie", last: "Robinson", lane: "baseball", archetype: "barrier breaker", real: true },
  { first: "Shohei", last: "Ohtani", lane: "baseball", archetype: "two-way star", real: true },
  { first: "Derek", last: "Jeter", lane: "baseball", archetype: "captain shortstop", real: true },
  { first: "Yogi", last: "Berra", lane: "baseball", archetype: "quotable catcher", real: true },
  // hockey
  { first: "Wayne", last: "Gretzky", lane: "hockey", archetype: "the great one", real: true },
  { first: "Sidney", last: "Crosby", lane: "hockey", archetype: "captain center", real: true },
  { first: "Alex", last: "Ovechkin", lane: "hockey", archetype: "goal machine", real: true },
  // soccer
  { first: "Lionel", last: "Messi", lane: "soccer", archetype: "dribbling maestro", real: true },
  { first: "Cristiano", last: "Ronaldo", lane: "soccer", archetype: "goal poacher", real: true },
  { first: "Megan", last: "Rapinoe", lane: "soccer", archetype: "big-game winger", real: true },
  { first: "Kylian", last: "Mbappe", lane: "soccer", archetype: "speed striker", real: true },
  // tennis
  { first: "Serena", last: "Williams", lane: "tennis", archetype: "power server", real: true },
  { first: "Roger", last: "Federer", lane: "tennis", archetype: "elegant baseliner", real: true },
  { first: "Rafael", last: "Nadal", lane: "tennis", archetype: "clay grinder", real: true },
  { first: "Coco", last: "Gauff", lane: "tennis", archetype: "rising ace", real: true },
  // golf
  { first: "Tiger", last: "Woods", lane: "golf", archetype: "major hunter", real: true },
  { first: "Jack", last: "Nicklaus", lane: "golf", archetype: "golden bear", real: true },
  { first: "Arnold", last: "Palmer", lane: "golf", archetype: "people's golfer", real: true },
  // racing
  { first: "Lewis", last: "Hamilton", lane: "racing", archetype: "grand prix ace", real: true },
  { first: "Dale", last: "Earnhardt", lane: "racing", archetype: "the intimidator", real: true },
  { first: "Danica", last: "Patrick", lane: "racing", archetype: "trailblazing driver", real: true },
  // combat sports
  { first: "Muhammad", last: "Ali", lane: "combat-sports", archetype: "the greatest", real: true },
  { first: "Rocky", last: "Marciano", lane: "combat-sports", archetype: "undefeated heavyweight", real: true },
  { first: "Ronda", last: "Rousey", lane: "combat-sports", archetype: "armbar specialist", real: true },
  // olympic / track / skiing / extreme
  { first: "Simone", last: "Biles", lane: "olympic", archetype: "gravity-optional gymnast", real: true },
  { first: "Michael", last: "Phelps", lane: "olympic", archetype: "pool torpedo", real: true },
  { first: "Katie", last: "Ledecky", lane: "olympic", archetype: "distance dominator", real: true },
  { first: "Usain", last: "Bolt", lane: "track-and-field", archetype: "fastest alive", real: true },
  { first: "Jesse", last: "Owens", lane: "track-and-field", archetype: "sprint legend", real: true },
  { first: "Lindsey", last: "Vonn", lane: "skiing", archetype: "downhill charger", real: true },
  { first: "Mikaela", last: "Shiffrin", lane: "skiing", archetype: "slalom queen", real: true },
  { first: "Tony", last: "Hawk", lane: "extreme-sports", archetype: "vert pioneer", real: true },
  { first: "Kelly", last: "Slater", lane: "extreme-sports", archetype: "wave rider", real: true },
  // coaches / broadcasters
  { first: "Vince", last: "Lombardi", lane: "coaches", archetype: "trophy namesake", real: true },
  { first: "Phil", last: "Jackson", lane: "coaches", archetype: "zen master", real: true },
  { first: "Dawn", last: "Staley", lane: "coaches", archetype: "champion builder", real: true },
  { first: "John", last: "Madden", lane: "broadcasters", archetype: "booth legend", real: true },
];

/**
 * Fictional/archetype transforms. These are prefix/suffix wordplay hooks,
 * not character names. Anything that leans on a famous franchise sound is
 * marked `nearBrand: true` and gets manual review before merch.
 */
export type ArchetypeTransform = {
  /** template with {Base} and optionally {Real} */
  template: string;
  lane: InspirationLane;
  archetype: string;
  nearBrand: boolean;
  heroSuitable: boolean;
};

export const ARCHETYPE_TRANSFORMS: ArchetypeTransform[] = [
  { template: "Bat{Base}", lane: "superheroes", archetype: "masked guardian", nearBrand: true, heroSuitable: true },
  { template: "Super{Base}", lane: "superheroes", archetype: "caped flyer", nearBrand: true, heroSuitable: true },
  { template: "Spider{Base}", lane: "superheroes", archetype: "wall crawler", nearBrand: true, heroSuitable: true },
  { template: "Captain {Base}", lane: "superheroes", archetype: "shield captain", nearBrand: false, heroSuitable: true },
  { template: "The Incredible {Base}", lane: "superheroes", archetype: "gentle giant", nearBrand: true, heroSuitable: true },
  { template: "{Base} the Mighty", lane: "superheroes", archetype: "hammer bearer", nearBrand: false, heroSuitable: true },
  { template: "Darth{Base}der", lane: "villains", archetype: "dramatic dark lord", nearBrand: true, heroSuitable: true },
  { template: "{Base}zilla", lane: "villains", archetype: "city-sized menace", nearBrand: true, heroSuitable: true },
  { template: "Dr. {Base}", lane: "villains", archetype: "scheming mastermind", nearBrand: false, heroSuitable: true },
  { template: "{Base} the Terrible", lane: "villains", archetype: "storybook tyrant", nearBrand: false, heroSuitable: true },
  { template: "{Base}nator", lane: "action-movies", archetype: "unstoppable machine", nearBrand: true, heroSuitable: true },
  { template: "{Base} Vice", lane: "action-movies", archetype: "80s cop show", nearBrand: false, heroSuitable: false },
  { template: "Agent {Base}", lane: "action-movies", archetype: "secret agent", nearBrand: false, heroSuitable: true },
  { template: "{Base}: Impossible", lane: "action-movies", archetype: "impossible missions", nearBrand: true, heroSuitable: false },
  { template: "Fast & {Base}rious", lane: "action-movies", archetype: "street racer", nearBrand: true, heroSuitable: false },
  { template: "{Base} McGroovin", lane: "comedy", archetype: "sketch character", nearBrand: false, heroSuitable: false },
  { template: "Anchordog {Base}", lane: "comedy", archetype: "news anchor", nearBrand: false, heroSuitable: false },
  { template: "{Base} the Entertainer", lane: "comedy", archetype: "stage comic", nearBrand: false, heroSuitable: false },
];

/** Titles for "title + trait" and formal identities. Generic, play-safe. */
export const TITLES: { title: string; lane: InspirationLane }[] = [
  { title: "Sir", lane: "royalty" },
  { title: "Lady", lane: "royalty" },
  { title: "Lord", lane: "royalty" },
  { title: "Duke", lane: "royalty" },
  { title: "Duchess", lane: "royalty" },
  { title: "Count", lane: "royalty" },
  { title: "Baron", lane: "royalty" },
  { title: "Princess", lane: "royalty" },
  { title: "King", lane: "royalty" },
  { title: "Queen", lane: "royalty" },
  { title: "His Royal Highness", lane: "royalty" },
  { title: "General", lane: "military-titles" },
  { title: "Sergeant", lane: "military-titles" },
  { title: "Commander", lane: "military-titles" },
  { title: "Colonel", lane: "military-titles" },
  { title: "Major", lane: "military-titles" },
  { title: "Admiral", lane: "military-titles" },
  { title: "Captain", lane: "military-titles" },
  { title: "Private First Class", lane: "military-titles" },
  { title: "Professor", lane: "professions" },
  { title: "Doctor", lane: "professions" },
  { title: "Chancellor", lane: "professions" },
  { title: "Inspector", lane: "professions" },
  { title: "Detective", lane: "professions" },
  { title: "Sheriff", lane: "professions" },
  { title: "Mayor", lane: "professions" },
  { title: "Chief Executive", lane: "professions" },
  { title: "Foreman", lane: "professions" },
  { title: "Chef", lane: "professions" },
  { title: "Coach", lane: "coaches" },
];

/** Sports positions/roles for "position + behavior" wordplay. */
export const SPORT_ROLES: { role: string; lane: InspirationLane }[] = [
  { role: "Quarterback", lane: "football" },
  { role: "Free Safety", lane: "football" },
  { role: "Linebacker", lane: "football" },
  { role: "Tight End", lane: "football" },
  { role: "Kick Returner", lane: "football" },
  { role: "Point Guard", lane: "basketball" },
  { role: "Sixth Man", lane: "basketball" },
  { role: "Shot Blocker", lane: "basketball" },
  { role: "Cleanup Hitter", lane: "baseball" },
  { role: "Closer", lane: "baseball" },
  { role: "Shortstop", lane: "baseball" },
  { role: "Enforcer", lane: "hockey" },
  { role: "Goalie", lane: "hockey" },
  { role: "Striker", lane: "soccer" },
  { role: "Sweeper", lane: "soccer" },
  { role: "Midfielder", lane: "soccer" },
  { role: "Baseliner", lane: "tennis" },
  { role: "Caddie", lane: "golf" },
  { role: "Pit Crew Chief", lane: "racing" },
  { role: "Pace Car", lane: "racing" },
  { role: "Heavyweight Champion", lane: "combat-sports" },
  { role: "Cornerman", lane: "combat-sports" },
  { role: "Anchor Leg", lane: "track-and-field" },
  { role: "Hurdler", lane: "track-and-field" },
  { role: "Downhiller", lane: "skiing" },
  { role: "Halfpipe Specialist", lane: "extreme-sports" },
  { role: "Play-by-Play Announcer", lane: "broadcasters" },
  { role: "Head Coach", lane: "coaches" },
  { role: "Team Captain", lane: "sports-language" },
  { role: "Franchise Player", lane: "sports-language" },
  { role: "MVP", lane: "sports-language" },
  { role: "Rookie of the Year", lane: "sports-language" },
  { role: "Hall of Famer", lane: "sports-language" },
  { role: "Undisputed Champion", lane: "sports-language" },
];

/** Generic mood/vibe adjectives, keyed by lane. All play-safe. */
export const LANE_WORDS: Partial<Record<InspirationLane, string[]>> = {
  food: ["Biscuit", "Meatball", "Noodle", "Pickles", "Waffles", "Nacho", "Tater", "Dumpling", "Pretzel", "Gravy", "Butterbean", "Mochi"],
  household: ["Roomba", "Doorbell", "Slipper", "Blanket", "Recliner", "Thermostat", "Lampshade", "Spatula", "Welcome Mat", "Throw Pillow"],
  weather: ["Thunder", "Tornado", "Blizzard", "Monsoon", "Heatwave", "Drizzle", "Fog Bank", "Tailwind", "Avalanche", "Sunbeam"],
  speed: ["Turbo", "Nitro", "Rocket", "Blur", "Mach One", "Zoomies", "Slipstream", "Afterburner", "Lightning", "Warp"],
  sleep: ["Snooze", "Nap Commander", "Pillow", "Dozer", "Hibernation", "Snore", "Dreamboat", "Lullaby", "Sunday Morning"],
  chaos: ["Mayhem", "Havoc", "Ruckus", "Hurricane", "Demolition", "Rampage", "Wrecking Ball", "Anarchy", "Kaboom"],
  bravery: ["Fearless", "Valiant", "Braveheart", "Guardian", "Sentinel", "Defender", "Lionheart", "Stalwart"],
  mischief: ["Bandit", "Rascal", "Scoundrel", "Trickster", "Smuggler", "Outlaw", "Heist", "Sneak", "Loophole"],
  affection: ["Velcro", "Snuggle", "Cuddlebug", "Sweetheart", "Heartthrob", "Smooch", "Marshmallow", "Honeybun"],
};

/** Rhyme/assonance bank — fun words grouped by their ending sound. */
export const RHYME_BANK: string[] = [
  "Papaya", "Bonanza", "Fiesta", "Tsunami", "Origami", "Salami", "Pastrami",
  "Confetti", "Spaghetti", "Machete", "Graffiti", "Zucchini", "Martini",
  "Bambino", "Torpedo", "Tornado", "Avocado", "Desperado", "Tuxedo",
  "Calzone", "Cyclone", "Cologne", "Trombone", "Doggone",
  "Kazoo", "Voodoo", "Bamboo", "Tattoo", "Hullabaloo",
  "Jamboree", "Pedigree", "Referee", "Jubilee",
  "Hooligan", "Shenanigan", "Cardigan",
  "Dynamo", "Domino", "Buffalo", "Piccolo",
];

/** Vocabulary the behavior patterns draw from, keyed by behavior id. */
export type BehaviorVocab = {
  /** the object or scene of the crime */
  noun: string;
  /** what the dog becomes, as an agent */
  agent: string;
  /** where it happens */
  place: string;
};

export const BEHAVIOR_VOCAB: Record<string, BehaviorVocab> = {
  "sock-thief": { noun: "Sock", agent: "Sock Bandit", place: "the laundry room" },
  "couch-guardian": { noun: "Couch", agent: "Couch Guardian", place: "the living room" },
  "delivery-alarm": { noun: "Doorbell", agent: "Package Inspector", place: "the front door" },
  "vacuum-coward": { noun: "Vacuum", agent: "Vacuum Evader", place: "under the bed" },
  "bath-escape": { noun: "Bathtub", agent: "Escape Artist", place: "the bathroom" },
  "dramatic-beggar": { noun: "Dinner", agent: "Snack Negotiator", place: "the kitchen floor" },
  "upside-down-sleeper": { noun: "Pillow", agent: "Upside-Down Dreamer", place: "the good couch" },
  "zoomies": { noun: "Zoomies", agent: "Living-Room Comet", place: "the hallway" },
  "lap-dog": { noun: "Lap", agent: "Lap Commander", place: "your lap" },
  "food-inspector": { noun: "Crumb", agent: "Food Inspector", place: "the kitchen" },
  "toy-destroyer": { noun: "Squeaker", agent: "Toy Surgeon", place: "the toy bin" },
  "blanket-burrower": { noun: "Blanket", agent: "Blanket Burrower", place: "the bed" },
  "window-watcher": { noun: "Window", agent: "Neighborhood Watch", place: "the front window" },
  "mud-finder": { noun: "Mud", agent: "Mud Cartographer", place: "the backyard" },
  "door-greeter": { noun: "Welcome", agent: "Chief Greeter", place: "the front hall" },
  "snorer": { noun: "Snore", agent: "Freight Train", place: "the foot of the bed" },
  "shadow-follower": { noun: "Shadow", agent: "Personal Escort", place: "two feet behind you" },
  "backyard-patrol": { noun: "Fence", agent: "Perimeter Patrol", place: "the backyard" },
  "car-ride-enthusiast": { noun: "Shotgun", agent: "Co-Pilot", place: "the passenger seat" },
  "squirrel-suspicious": { noun: "Squirrel", agent: "Squirrel Analyst", place: "the oak tree" },
};

/** Fallback vocab for owner-entered custom behaviors. */
export function customVocab(text: string): BehaviorVocab {
  const short = text.length > 24 ? text.slice(0, 24).trim() : text;
  return { noun: short, agent: "Specialist", place: "home" };
}

/** Mood → storybook archetype pairings. Generic, play-safe. */
export const MOOD_ARCHETYPES: Record<string, string[]> = {
  sleepy: ["the Serene", "the Hibernator", "of the Eternal Nap", "the Pillow Sage"],
  hungry: ["the Ever-Hungry", "the Crumb Seeker", "of the Bottomless Bowl"],
  goofy: ["the Jester", "the Unserious", "of Infinite Wiggles"],
  cuddly: ["the Gentle", "the Velcro-Hearted", "of the Warm Lap"],
  dramatic: ["the Theatrical", "the Misunderstood", "of the Heavy Sigh"],
  wild: ["the Untamed", "the Zoomer", "of the Backyard Steppe"],
  brave: ["the Bold", "the Unflinching", "Guardian of the Yard"],
  grumpy: ["the Unimpressed", "the Skeptic", "of the Side-Eye"],
  proud: ["the Magnificent", "the Distinguished", "of the High Head"],
  sneaky: ["the Silent", "the Untraceable", "of the Missing Snacks"],
};
