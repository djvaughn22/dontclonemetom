// Dog Identity Engine — the famous-name lexicon.
//
// This is DATA: movie stars, musicians, sports legends, and historical
// greats the generator rhymes against, plus hand-written dog puns on those
// names. Famous names are rhyme SOURCES — the engine never outputs a real
// person's full name, and results that keep a real surname are honestly
// labeled for manual review before any commercial use.
//
// Adding a star: one FAMOUS_SOURCES line. Adding a great pun you thought
// of in the shower: one PUNNED_FAMOUS line.

import type { InspirationLane } from "./types";

/** A famous name to rhyme against. `real` = a real person (stricter rights).
 *  `swap` = the first name's rime reads naturally with ANY dog-name onset
 *  ("atrick" → Batrick/Zatrick/Chatrick). Names without it are never
 *  machine-swapped — that's what kept "Bom Hanks" out of the deck. */
export type FamousSource = {
  first: string;
  last: string;
  lane: InspirationLane;
  archetype: string;
  real: boolean;
  swap?: boolean;
};

export const FAMOUS_SOURCES: FamousSource[] = [
  // movie & TV stars
  { first: "Patrick", last: "Swayze", lane: "actors", archetype: "dance legend", real: true, swap: true },
  { first: "Keanu", last: "Reeves", lane: "actors", archetype: "quiet action hero", real: true },
  { first: "Meryl", last: "Streep", lane: "actors", archetype: "award collector", real: true, swap: true },
  { first: "Denzel", last: "Washington", lane: "actors", archetype: "commanding lead", real: true, swap: true },
  { first: "Harrison", last: "Ford", lane: "actors", archetype: "reluctant adventurer", real: true, swap: true },
  { first: "Sandra", last: "Bullock", lane: "actors", archetype: "america's sweetheart", real: true, swap: true },
  { first: "Morgan", last: "Freeman", lane: "actors", archetype: "the narrator", real: true, swap: true },
  { first: "Tom", last: "Hanks", lane: "actors", archetype: "everyman hero", real: true },
  { first: "Emma", last: "Stone", lane: "actors", archetype: "comedy lead", real: true },
  { first: "Brad", last: "Pitt", lane: "actors", archetype: "leading man", real: true },
  { first: "Tom", last: "Cruise", lane: "actors", archetype: "stunt maniac", real: true },
  { first: "Matt", last: "Damon", lane: "actors", archetype: "capable everyman", real: true },
  { first: "Julia", last: "Roberts", lane: "actors", archetype: "megawatt smile", real: true },
  { first: "Jennifer", last: "Lawrence", lane: "actors", archetype: "action lead", real: true, swap: true },
  { first: "Scarlett", last: "Johansson", lane: "actors", archetype: "action star", real: true },
  { first: "Chris", last: "Hemsworth", lane: "actors", archetype: "hammer guy", real: true },
  { first: "Zendaya", last: "Coleman", lane: "actors", archetype: "generational talent", real: true },
  { first: "Al", last: "Pacino", lane: "actors", archetype: "intense legend", real: true },
  { first: "Robert", last: "De Niro", lane: "actors", archetype: "screen heavyweight", real: true, swap: true },
  { first: "Clint", last: "Eastwood", lane: "actors", archetype: "squinting cowboy", real: true },
  { first: "Eddie", last: "Murphy", lane: "comedy", archetype: "comedy legend", real: true, swap: true },
  { first: "Jim", last: "Carrey", lane: "comedy", archetype: "rubber face", real: true },
  { first: "Will", last: "Ferrell", lane: "comedy", archetype: "comedy anchor", real: true },
  { first: "Kevin", last: "Hart", lane: "comedy", archetype: "pocket dynamo", real: true },
  { first: "Adam", last: "Sandler", lane: "comedy", archetype: "comfy-clothes king", real: true, swap: true },
  { first: "Oprah", last: "Winfrey", lane: "celebrity", archetype: "talk-show royalty", real: true, swap: true },
  { first: "Gordon", last: "Ramsay", lane: "celebrity", archetype: "kitchen commander", real: true },
  { first: "David", last: "Attenborough", lane: "broadcasters", archetype: "nature narrator", real: true, swap: true },
  // musicians
  { first: "Taylor", last: "Swift", lane: "musicians", archetype: "pop icon", real: true, swap: true },
  { first: "Dolly", last: "Parton", lane: "musicians", archetype: "country legend", real: true, swap: true },
  { first: "Elvis", last: "Presley", lane: "musicians", archetype: "rock legend", real: true, swap: true },
  { first: "Aretha", last: "Franklin", lane: "musicians", archetype: "soul queen", real: true, swap: true },
  { first: "Johnny", last: "Cash", lane: "musicians", archetype: "outlaw balladeer", real: true },
  { first: "Willie", last: "Nelson", lane: "musicians", archetype: "road troubadour", real: true, swap: true },
  { first: "Stevie", last: "Wonder", lane: "musicians", archetype: "keyboard genius", real: true, swap: true },
  { first: "Bruno", last: "Mars", lane: "musicians", archetype: "showman", real: true },
  { first: "Katy", last: "Perry", lane: "musicians", archetype: "pop headliner", real: true },
  { first: "Billie", last: "Eilish", lane: "musicians", archetype: "genre bender", real: true, swap: true },
  { first: "Bruce", last: "Springsteen", lane: "musicians", archetype: "the boss", real: true },
  { first: "Mick", last: "Jagger", lane: "musicians", archetype: "strutting frontman", real: true },
  { first: "Snoop", last: "Dogg", lane: "musicians", archetype: "laid-back legend", real: true, swap: true },
  // football
  { first: "Tom", last: "Brady", lane: "football", archetype: "quarterback goat", real: true },
  { first: "Patrick", last: "Mahomes", lane: "football", archetype: "no-look magician", real: true, swap: true },
  { first: "Jerry", last: "Rice", lane: "football", archetype: "route perfectionist", real: true, swap: true },
  { first: "Barry", last: "Sanders", lane: "football", archetype: "ankle breaker", real: true, swap: true },
  { first: "Walter", last: "Payton", lane: "football", archetype: "sweetness himself", real: true },
  { first: "Deion", last: "Sanders", lane: "football", archetype: "prime time", real: true },
  { first: "Travis", last: "Kelce", lane: "football", archetype: "touchdown celebrator", real: true, swap: true },
  { first: "Peyton", last: "Manning", lane: "football", archetype: "audible caller", real: true, swap: true },
  { first: "Joe", last: "Montana", lane: "football", archetype: "comeback king", real: true },
  { first: "Dan", last: "Marino", lane: "football", archetype: "laser arm", real: true },
  // basketball
  { first: "Michael", last: "Jordan", lane: "basketball", archetype: "clutch scorer", real: true, swap: true },
  { first: "LeBron", last: "James", lane: "basketball", archetype: "all-around force", real: true, swap: true },
  { first: "Stephen", last: "Curry", lane: "basketball", archetype: "long-range shooter", real: true },
  { first: "Shaquille", last: "O'Neal", lane: "basketball", archetype: "unstoppable center", real: true, swap: true },
  { first: "Caitlin", last: "Clark", lane: "basketball", archetype: "logo shooter", real: true, swap: true },
  { first: "Kevin", last: "Durant", lane: "basketball", archetype: "smooth scorer", real: true },
  { first: "Larry", last: "Bird", lane: "basketball", archetype: "trash-talk sniper", real: true, swap: true },
  { first: "Magic", last: "Johnson", lane: "basketball", archetype: "showtime maestro", real: true, swap: true },
  { first: "Giannis", last: "Antetokounmpo", lane: "basketball", archetype: "greek freak", real: true },
  // baseball
  { first: "Babe", last: "Ruth", lane: "baseball", archetype: "slugger", real: true },
  { first: "Jackie", last: "Robinson", lane: "baseball", archetype: "barrier breaker", real: true },
  { first: "Shohei", last: "Ohtani", lane: "baseball", archetype: "two-way star", real: true },
  { first: "Derek", last: "Jeter", lane: "baseball", archetype: "captain shortstop", real: true },
  { first: "Yogi", last: "Berra", lane: "baseball", archetype: "quotable catcher", real: true, swap: true },
  { first: "Aaron", last: "Judge", lane: "baseball", archetype: "towering slugger", real: true, swap: true },
  { first: "Mike", last: "Trout", lane: "baseball", archetype: "five-tool machine", real: true },
  // hockey
  { first: "Wayne", last: "Gretzky", lane: "hockey", archetype: "the great one", real: true, swap: true },
  { first: "Sidney", last: "Crosby", lane: "hockey", archetype: "captain center", real: true, swap: true },
  { first: "Alex", last: "Ovechkin", lane: "hockey", archetype: "goal machine", real: true },
  // soccer
  { first: "Lionel", last: "Messi", lane: "soccer", archetype: "dribbling maestro", real: true },
  { first: "Cristiano", last: "Ronaldo", lane: "soccer", archetype: "goal poacher", real: true, swap: true },
  { first: "Megan", last: "Rapinoe", lane: "soccer", archetype: "big-game winger", real: true },
  { first: "Kylian", last: "Mbappe", lane: "soccer", archetype: "speed striker", real: true },
  { first: "David", last: "Beckham", lane: "soccer", archetype: "free-kick artist", real: true, swap: true },
  { first: "Neymar", last: "Junior", lane: "soccer", archetype: "flair merchant", real: true },
  // tennis
  { first: "Serena", last: "Williams", lane: "tennis", archetype: "power server", real: true, swap: true },
  { first: "Venus", last: "Williams", lane: "tennis", archetype: "trailblazing champion", real: true },
  { first: "Roger", last: "Federer", lane: "tennis", archetype: "elegant baseliner", real: true },
  { first: "Rafael", last: "Nadal", lane: "tennis", archetype: "clay grinder", real: true, swap: true },
  { first: "Coco", last: "Gauff", lane: "tennis", archetype: "rising ace", real: true },
  { first: "Novak", last: "Djokovic", lane: "tennis", archetype: "iron champion", real: true },
  // golf
  { first: "Tiger", last: "Woods", lane: "golf", archetype: "major hunter", real: true, swap: true },
  { first: "Jack", last: "Nicklaus", lane: "golf", archetype: "golden bear", real: true },
  { first: "Arnold", last: "Palmer", lane: "golf", archetype: "people's golfer", real: true, swap: true },
  // racing
  { first: "Lewis", last: "Hamilton", lane: "racing", archetype: "grand prix ace", real: true },
  { first: "Dale", last: "Earnhardt", lane: "racing", archetype: "the intimidator", real: true },
  { first: "Danica", last: "Patrick", lane: "racing", archetype: "trailblazing driver", real: true },
  // combat sports
  { first: "Muhammad", last: "Ali", lane: "combat-sports", archetype: "the greatest", real: true },
  { first: "Rocky", last: "Marciano", lane: "combat-sports", archetype: "undefeated heavyweight", real: true },
  { first: "Ronda", last: "Rousey", lane: "combat-sports", archetype: "armbar specialist", real: true, swap: true },
  // olympic / track / skiing / extreme
  { first: "Simone", last: "Biles", lane: "olympic", archetype: "gravity-optional gymnast", real: true },
  { first: "Michael", last: "Phelps", lane: "olympic", archetype: "pool torpedo", real: true, swap: true },
  { first: "Katie", last: "Ledecky", lane: "olympic", archetype: "distance dominator", real: true },
  { first: "Usain", last: "Bolt", lane: "track-and-field", archetype: "fastest alive", real: true, swap: true },
  { first: "Jesse", last: "Owens", lane: "track-and-field", archetype: "sprint legend", real: true },
  { first: "Lindsey", last: "Vonn", lane: "skiing", archetype: "downhill charger", real: true, swap: true },
  { first: "Mikaela", last: "Shiffrin", lane: "skiing", archetype: "slalom queen", real: true },
  { first: "Tony", last: "Hawk", lane: "extreme-sports", archetype: "vert pioneer", real: true, swap: true },
  { first: "Kelly", last: "Slater", lane: "extreme-sports", archetype: "wave rider", real: true, swap: true },
  // coaches / broadcasters
  { first: "Vince", last: "Lombardi", lane: "coaches", archetype: "trophy namesake", real: true },
  { first: "Phil", last: "Jackson", lane: "coaches", archetype: "zen master", real: true },
  { first: "Dawn", last: "Staley", lane: "coaches", archetype: "champion builder", real: true },
  { first: "John", last: "Madden", lane: "broadcasters", archetype: "booth legend", real: true },
  // historical greats
  { first: "Abraham", last: "Lincoln", lane: "historical", archetype: "steady statesman", real: true },
  { first: "Winston", last: "Churchill", lane: "historical", archetype: "bulldog statesman", real: true, swap: true },
  { first: "Amelia", last: "Earhart", lane: "historical", archetype: "fearless aviator", real: true, swap: true },
  { first: "Napoleon", last: "Bonaparte", lane: "historical", archetype: "small general", real: true, swap: true },
  { first: "Teddy", last: "Roosevelt", lane: "historical", archetype: "rough rider", real: true, swap: true },
];

/**
 * Curated dog-pun celebrity names — the "Pawtrick Swayze" register. These
 * are hand-written puns, not mechanical blends, so every one reads out
 * loud. `risk` is the honest floor: real-person surnames and franchise
 * sounds stay manualReview before any paid use; long-dead historical and
 * public-domain figures play safe.
 */
export type PunnedFamous = {
  pun: string;
  source: string;
  lane: InspirationLane;
  archetype: string;
  risk: "playSafe" | "manualReview";
};

export const PUNNED_FAMOUS: PunnedFamous[] = [
  // actors
  { pun: "Pawtrick Swayze", source: "Patrick Swayze", lane: "actors", archetype: "dance legend", risk: "manualReview" },
  { pun: "Brad Sitt", source: "Brad Pitt", lane: "actors", archetype: "leading man", risk: "manualReview" },
  { pun: "Jennifer Pawrence", source: "Jennifer Lawrence", lane: "actors", archetype: "action lead", risk: "manualReview" },
  { pun: "Keanu Retrieves", source: "Keanu Reeves", lane: "actors", archetype: "quiet action hero", risk: "manualReview" },
  { pun: "Sandra Bulldog", source: "Sandra Bullock", lane: "actors", archetype: "america's sweetheart", risk: "manualReview" },
  { pun: "Denzel Waggington", source: "Denzel Washington", lane: "actors", archetype: "commanding lead", risk: "manualReview" },
  { pun: "Will Furrell", source: "Will Ferrell", lane: "comedy", archetype: "comedy anchor", risk: "manualReview" },
  { pun: "Harrison Furred", source: "Harrison Ford", lane: "actors", archetype: "reluctant adventurer", risk: "manualReview" },
  { pun: "Rover Downey Jr.", source: "Robert Downey Jr.", lane: "actors", archetype: "comeback king", risk: "manualReview" },
  // musicians
  { pun: "Dolly Pawton", source: "Dolly Parton", lane: "musicians", archetype: "country legend", risk: "manualReview" },
  { pun: "Elvis Pawsley", source: "Elvis Presley", lane: "musicians", archetype: "rock legend", risk: "manualReview" },
  { pun: "Bruno Barks", source: "Bruno Mars", lane: "musicians", archetype: "showman", risk: "manualReview" },
  { pun: "Katy Pawry", source: "Katy Perry", lane: "musicians", archetype: "pop headliner", risk: "manualReview" },
  { pun: "Ed Sheddin'", source: "Ed Sheeran", lane: "musicians", archetype: "singer-songwriter", risk: "manualReview" },
  { pun: "Billie Howlish", source: "Billie Eilish", lane: "musicians", archetype: "genre bender", risk: "manualReview" },
  { pun: "Kanye Westie", source: "Kanye West", lane: "musicians", archetype: "producer mogul", risk: "manualReview" },
  { pun: "50 Scent", source: "50 Cent", lane: "musicians", archetype: "rap heavyweight", risk: "manualReview" },
  { pun: "The Notorious D.O.G.", source: "The Notorious B.I.G.", lane: "musicians", archetype: "rap legend", risk: "manualReview" },
  // sports legends
  { pun: "Tiger Woofs", source: "Tiger Woods", lane: "golf", archetype: "major hunter", risk: "manualReview" },
  { pun: "Roger Fetcher", source: "Roger Federer", lane: "tennis", archetype: "elegant baseliner", risk: "manualReview" },
  { pun: "Novak Dogovic", source: "Novak Djokovic", lane: "tennis", archetype: "iron champion", risk: "manualReview" },
  { pun: "Coco Ruff", source: "Coco Gauff", lane: "tennis", archetype: "rising ace", risk: "manualReview" },
  { pun: "Lionel Messy", source: "Lionel Messi", lane: "soccer", archetype: "dribbling maestro", risk: "manualReview" },
  { pun: "Wayne Fetchky", source: "Wayne Gretzky", lane: "hockey", archetype: "the great one", risk: "manualReview" },
  { pun: "Babe Woof", source: "Babe Ruth", lane: "baseball", archetype: "slugger", risk: "manualReview" },
  { pun: "Scottie Puppen", source: "Scottie Pippen", lane: "basketball", archetype: "elite wingman", risk: "manualReview" },
  { pun: "Barky Bonds", source: "Barry Bonds", lane: "baseball", archetype: "home-run king", risk: "manualReview" },
  // historical & public domain — long-gone figures, wordplay plays safe
  { pun: "Napoleon Bone-aparte", source: "Napoleon Bonaparte", lane: "historical", archetype: "small general", risk: "playSafe" },
  { pun: "Droolius Caesar", source: "Julius Caesar", lane: "historical", archetype: "roman ruler", risk: "playSafe" },
  { pun: "Cleopawtra", source: "Cleopatra", lane: "historical", archetype: "ancient royalty", risk: "playSafe" },
  { pun: "Alexander the Grrreat", source: "Alexander the Great", lane: "historical", archetype: "conqueror", risk: "playSafe" },
  { pun: "Winston Furchill", source: "Winston Churchill", lane: "historical", archetype: "bulldog statesman", risk: "manualReview" },
  { pun: "Bark Twain", source: "Mark Twain", lane: "historical", archetype: "wit on the river", risk: "playSafe" },
  { pun: "Abraham Lick-in", source: "Abraham Lincoln", lane: "historical", archetype: "steady statesman", risk: "playSafe" },
  { pun: "Sherlock Bones", source: "Sherlock Holmes", lane: "fictional", archetype: "great detective", risk: "playSafe" },
  { pun: "Vincent Van Dog", source: "Vincent van Gogh", lane: "historical", archetype: "wild-eyed painter", risk: "playSafe" },
  { pun: "Leonardo da Fetchi", source: "Leonardo da Vinci", lane: "historical", archetype: "renaissance mind", risk: "playSafe" },
  { pun: "Woofgang A. Mozart", source: "Wolfgang Amadeus Mozart", lane: "historical", archetype: "prodigy composer", risk: "playSafe" },
  // franchise-flavored — fun in the game, honest review floor for merch
  { pun: "Mary Puppins", source: "Mary Poppins", lane: "fictional", archetype: "magical caretaker", risk: "manualReview" },
  { pun: "Chewbarka", source: "Chewbacca", lane: "fictional", archetype: "loyal co-pilot", risk: "manualReview" },
  { pun: "Indiana Bones", source: "Indiana Jones", lane: "action-movies", archetype: "treasure hunter", risk: "manualReview" },
  { pun: "James Bone", source: "James Bond", lane: "action-movies", archetype: "secret agent", risk: "manualReview" },
  { pun: "Winnie the Pooch", source: "Winnie the Pooh", lane: "fictional", archetype: "honey enthusiast", risk: "manualReview" },
  { pun: "Hairy Pawter", source: "Harry Potter", lane: "fictional", archetype: "boy wizard", risk: "manualReview" },
];
