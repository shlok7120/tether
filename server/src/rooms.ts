import { WebSocket } from "ws";
import { ServerMessage } from "../../shared/protocol";

const WORDS = [
  "autumn", "hidden", "bitter", "mist", "silent", "empty", "dry", "dark",
  "summer", "icy", "delicate", "quiet", "white", "cool", "spring", "winter",
  "patient", "twilight", "dawn", "crimson", "wispy", "weathered", "blue",
  "billowing", "broken", "cold", "damp", "falling", "frosty", "green",
  "long", "late", "lingering", "bold", "little", "morning", "muddy", "old",
  "red", "rough", "still", "small", "sparkling", "throbbing", "shy",
  "wandering", "withered", "wild", "black", "young", "holy", "solitary",
  "fragrant", "aged", "snowy", "proud", "floral", "restless", "divine",
  "polished", "ancient", "purple", "lively", "nameless", "star", "river",
  "flower", "pebble", "leaf", "willow", "rain", "tree", "moon", "cloud",
  "mountain", "meadow", "sun", "sound", "water", "shadow", "valley",
  "hill", "wood", "bird", "night", "snow", "lake", "wind",
  "sky", "dust", "light", "stone", "fire", "sand", "sea", "wave", "breeze",
  "grass", "weed", "forest", "frost", "smoke", "ash",
  "drop", "ice", "chill", "haze", "storm", "fog", "glow",
  "heat", "glint", "spark", "beam", "flash", "flare", "ray",
  "gale", "hurricane",
  "tornado", "cyclone", "typhoon", "drizzle", "shower", "downpour",
  "flood", "sleet", "hail", "glacier", "avalanche",
  "quake", "tremor", "shake", "shock", "blast", "explosion", "eruption",
  "volcano", "lava", "magma", "soot", "dirt",
  "gravel", "rock", "boulder", "cliff", "crag",
  "peak", "summit", "ridge", "canyon", "gorge",
  "chasm", "abyss", "pit", "hole", "cave", "cavern", "mine", "tunnel",
  "shaft", "well", "spring", "source", "fountain", "stream", "brook",
  "creek", "pond", "pool", "puddle", "ocean",
  "gulf", "bay", "cove", "harbor", "port", "dock", "pier", "wharf", "quay",
  "beach", "shore", "coast", "bank", "island", "isle", "reef", "shoal",
  "swamp", "marsh", "bog", "fen", "moor", "heath", "plain", "prairie",
  "steppe", "tundra", "desert", "dune", "oasis", "jungle",
  "grove", "orchard", "park", "garden", "yard", "lawn", "field",
  "pasture", "farm", "ranch", "estate", "plant", "bush", "shrub",
  "vine", "creeper", "fern", "moss", "lichen", "fungus", "mushroom", "mold",
  "algae", "seaweed", "kelp", "coral", "sponge", "shell", "snail", "slug",
  "worm", "grub", "caterpillar", "bug", "insect", "beetle", "ant", "bee",
  "wasp", "fly", "mosquito", "gnat", "moth", "butterfly", "spider", "tick",
  "mite", "scorpion", "crab", "lobster", "shrimp", "prawn", "squid",
  "octopus", "clam", "oyster", "mussel", "scallop", "starfish", "urchin",
  "fish", "shark", "eel", "frog", "toad", "newt", "salamander",
  "lizard", "snake", "turtle", "tortoise", "croc", "gator"
];

export class Room {
  code: string;
  peers: Set<WebSocket> = new Set();
  timer: NodeJS.Timeout | null = null;

  constructor(code: string) {
    this.code = code;
    this.resetTimer();
  }

  resetTimer() {
    if (this.timer) clearTimeout(this.timer);
    // Expire in 10 minutes if no peers
    this.timer = setTimeout(() => {
      if (this.peers.size === 0) {
        RoomManager.deleteRoom(this.code);
      }
    }, 10 * 60 * 1000);
  }

  addPeer(ws: WebSocket) {
    if (this.peers.size >= 2) return false;
    this.peers.add(ws);
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    return true;
  }

  removePeer(ws: WebSocket) {
    this.peers.delete(ws);
    if (this.peers.size === 0) {
      // Room deleted immediately when both peers disconnect
      RoomManager.deleteRoom(this.code);
    }
  }

  broadcast(message: ServerMessage, except?: WebSocket) {
    const data = JSON.stringify(message);
    for (const peer of this.peers) {
      if (peer !== except && peer.readyState === WebSocket.OPEN) {
        peer.send(data);
      }
    }
  }
}

export class RoomManager {
  static rooms = new Map<string, Room>();

  static generateCode(): string {
    const getRandomWord = () => WORDS[Math.floor(Math.random() * WORDS.length)] || "word";
    return `${getRandomWord()}-${getRandomWord()}-${getRandomWord()}`;
  }

  static createRoom(): Room {
    let code = this.generateCode();
    while (this.rooms.has(code)) {
      code = this.generateCode();
    }
    const room = new Room(code);
    this.rooms.set(code, room);
    return room;
  }

  static getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  static deleteRoom(code: string) {
    const room = this.rooms.get(code);
    if (room && room.timer) {
      clearTimeout(room.timer);
    }
    this.rooms.delete(code);
  }
}
