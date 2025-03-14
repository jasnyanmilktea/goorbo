import {
  Class,
  Familiar,
  getPermedSkills,
  Item,
  Monster,
  printHtml,
  Skill,
  storageAmount,
} from "kolmafia";
import {
  $class,
  $familiar,
  $familiars,
  $item,
  $items,
  $skill,
  CombatLoversLocket,
  get,
  have,
} from "libram";
import { defaultPermList, permTiers, targetClass, targetPerms } from "./perm";

type SpecialThing = {
  have: () => boolean;
  name: string;
};

type Thing = Item | Familiar | Skill | Monster | SpecialThing;
interface Requirement {
  thing: Thing | Thing[];
  why: string;
  optional?: boolean;
}

/**
 * Return: a list of all things required to run the script.
 */
const generalList: Requirement[] = [
  { thing: $familiar`Grey Goose`, why: "Running Grey You Path" },
  { thing: $skill`Curse of Weaksauce`, why: "aftercore combat" },
  {
    thing: $familiars`Robortender, Space Jellyfish, Hobo Monkey, Leprechaun`,
    why: "in-run farming familiar",
  },
  { thing: $skill`Torso Awareness`, why: "general purpose", optional: true },
  {
    thing: $item`porquoise-handled sixgun`,
    why: "mp maintenance (20-30 free mp / combat)",
    optional: true,
  },
];
const levelList: Requirement[] = [
  { thing: $item`January's Garbage Tote`, why: "aftercore leveling", optional: true },
  {
    thing: {
      have: () => get("getawayCampsiteUnlocked"),
      name: $item`Distant Woods Getaway Brochure`.name,
    },
    why: "aftercore leveling",
    optional: true,
  },
  {
    thing: {
      have: () => get("neverendingPartyAlways"),
      name: $item`Neverending Party invitation envelope`.name,
    },
    why: "scaling free fights",
    optional: true,
  },
  { thing: $item`Clan VIP Lounge key`, why: "aftercore leveling", optional: true },
  // { thing: $skill`Sweet Synthesis`, why: "aftercore leveling", optional: true },
  // { thing: $familiar`Vampire Vintner`, why: "goose charging", optional: true },
  { thing: $item`familiar scrapbook`, why: "aftercore leveling", optional: true },
  { thing: $item`defective Game Grid token`, why: "aftercore leveling", optional: true },
  { thing: $item`trench lighter`, why: "aftercore leveling", optional: true },
  { thing: $skill`Feel Pride`, why: "aftercore leveling", optional: true },
  { thing: $item`[glitch season reward name]`, why: "aftercore leveling", optional: true },
  // { thing: $item`cosmic bowling ball`, why: "aftercore leveling", optional: true },
  { thing: $item`fake washboard`, why: "aftercore leveling (mus)", optional: true },
  { thing: $skill`Inscrutable Gaze`, why: "aftercore leveling (mys)", optional: true },
  { thing: $item`basaltamander buckler`, why: "aftercore leveling (mys)", optional: true },
];
const profitList: Requirement[] = [
  { thing: $item`lucky gold ring`, why: "in-run farming profits", optional: true },
  { thing: $item`Mr. Cheeng's spectacles`, why: "in-run farming profits", optional: true },
  { thing: $item`mafia thumb ring`, why: "in-run farming profits", optional: true },
  { thing: $item`SongBoom™ BoomBox`, why: "in-run farming profits", optional: true },
  {
    thing: $items`Asdon Martin keyfob, Little Geneticist DNA-Splicing Lab, portable Mayo Clinic, warbear induction oven, snow machine`,
    why: "various profits",
    optional: true,
  },
  { thing: $item`June cleaver`, why: "in-run farming profits", optional: true },
  { thing: $item`tiny stillsuit`, why: "rollover adventures", optional: true },
  { thing: $item`mime army shotglass`, why: "extra size-1 booze/day", optional: true },
  { thing: $familiar`Stooper`, why: "rollover adventures", optional: true },
  { thing: $item`Drunkula's wineglass`, why: "overdrunk farming", optional: true },
  {
    thing: $item`infinite BACON machine`,
    why: "daily Dungeon Malware",
    optional: true,
  },
];
const freefightList: Requirement[] = [
  { thing: $item`carnivorous potted plant`, why: "occasional free kill", optional: true },
  { thing: $item`cursed magnifying glass`, why: "additional free fight", optional: true },
  { thing: $item`miniature crystal ball`, why: "additional free fight", optional: true },
  { thing: $item`Claw of the Infernal Seal`, why: "5 additional free seals", optional: true },
  { thing: $item`The Jokester's gun`, why: "free kill", optional: true },
  { thing: $skill`Gingerbread Mob Hit`, why: "free kill", optional: true },
  { thing: $skill`Shattering Punch`, why: "3 free kills", optional: true },
  { thing: $item`Lil' Doctor™ bag`, why: "3 free kills", optional: true },
];
const marginalList: Requirement[] = [
  { thing: $skill`Snokebomb`, why: "banish", optional: true },
  { thing: $skill`Feel Hatred`, why: "banish", optional: true },
  { thing: $item`mafia middle finger ring`, why: "banish", optional: true },
  { thing: $item`hewn moon-rune spoon`, why: "easier perming of gnome skills", optional: true },
  { thing: $skill`Comprehensive Cartography`, why: "gold wedding ring", optional: true },
];

function checkThing(thing: Thing): [boolean, string] {
  if ("have" in thing && "name" in thing && thing.have instanceof Function)
    return [thing.have(), thing.name]; //if this is a SpecialThing
  if (thing instanceof Familiar) return [have(thing), thing.hatchling.name];
  if (thing instanceof Skill) return [thing.name in getPermedSkills(), thing.name];
  if (thing instanceof Monster)
    return [new Set(CombatLoversLocket.unlockedLocketMonsters()).has(thing), thing.name];
  if (thing instanceof Item) return [have(thing) || storageAmount(thing) > 0, thing.name];
  return [false, thing.name];
}

function check(req: Requirement): [boolean, string, Requirement] {
  if (Array.isArray(req.thing)) {
    const checks = req.thing.map(checkThing);

    return [
      checks.find((res) => res[0]) !== undefined,
      checks.map((res) => res[1]).join(" OR "),
      req,
    ];
  } else {
    const res = checkThing(req.thing);
    return [res[0], res[1], req];
  }
}

export function checkReqs(printout = true): string {
  let missing_optional = 0;
  let missing = 0;
  let out = "";

  const categories: [string, Requirement[]][] = [
    ["Required", generalList.filter((req) => !req.optional)],
    ["General", generalList.filter((req) => req.optional)],
    ["Leveling", levelList],
    ["Free Fights", freefightList],
    ["Profits", profitList],
    ["Marginal", marginalList],
  ];

  out = out.concat(
    "<p>Legend: <font color='#888888'>✓ Have</font> / <font color='red'>X Missing & Required</font> / <font color='black'>X Missing & Optional </font></p>"
  );
  for (const [name, requirements] of categories) {
    if (requirements.length === 0) continue;

    const requirements_info: [boolean, string, Requirement][] = requirements.map(check);
    out = out.concat(`<p><font color="blue">${name}</font></p>`);
    for (const [have_it, name, req] of requirements_info.sort((a, b) => a[1].localeCompare(b[1]))) {
      const color = have_it ? "#888888" : req.optional ? "black" : "red";
      const symbol = have_it ? "✓" : "X";
      if (!have_it && req.optional) missing_optional++;
      if (!have_it && !req.optional) missing++;
      out = out.concat(`<div><font color="${color}">${symbol} ${name} - ${req.why}</font></div>`);
    }
    if (printout) printHtml(out);
  }

  // Print the count of missing things
  if (missing > 0) {
    out = out.concat(
      `<p><font color="red">You are missing ${missing} required things. This script will not yet work for you.</font></p>`
    );
    if (missing_optional > 0)
      out = out.concat(`<div>You are also missing ${missing_optional} optional things.</div>`);
  } else {
    if (missing_optional > 0) {
      out = out.concat(
        `<p>You are missing ${missing_optional} optional things. This script should work, but it could do better.</p>`
      );
    } else {
      out = out.concat(
        `<p>You have everything! You are the shiniest star. This script should work great.</p>`
      );
    }
  }
  if (printout) printHtml(out, false);
  return out;
}

function spanWrap(text: string, color: string): string {
  return `<font color="${color}">${text}</font>`;
}
export function coloredSkill(sk: Skill, nPerms: Skill[], nClass: Class): string {
  return sk.name in getPermedSkills()
    ? spanWrap(sk.name, "#888")
    : nPerms.includes(sk) && have(sk)
    ? spanWrap(sk.name, "fuchsia")
    : nPerms.includes(sk)
    ? spanWrap(sk.name, "blue")
    : have(sk)
    ? spanWrap(sk.name, "purple")
    : nClass && nClass === sk.class && nClass !== $class`none`
    ? spanWrap(sk.name, "navy")
    : spanWrap(sk.name, "black");
}

export function checkPerms(printout = true): string {
  const nPerms = targetPerms(false);
  const nClass = targetClass(false);
  let out = "";
  out = out.concat(`<p>Default Perm List</p>`);
  out = out.concat(
    `<div>Legend: <font color="#888">[permed]</font>, <font color="fuchsia">[targeted/known]</font>, <font color="blue">[targeted/unknown]</font>, <font color="purple">[known]</font>, <font color="navy">[class skills]</font>, <font color="black">[other]</font></div>`
  );
  let count = 0;
  defaultPermList().forEach(
    (sks) =>
      (out = out.concat(
        `<p><font color="blue">${permTiers[count++]}</font></p> ${sks
          .map((sk) => coloredSkill(sk, nPerms, nClass))
          .join(", ")}`
      ))
  );
  if (printout) printHtml(out, false);
  return out;
}
