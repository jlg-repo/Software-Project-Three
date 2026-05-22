const VEGETARIAN_TERMS = [
  "cheese",
  "egg",
  "naan",
  "cookie",
  "cake",
  "caesar",
  "ranch",
  "mustard",
  "vinaigrette",
  "dressing",
  "honey",
];

const VEGAN_TERMS = [
  "tofu",
  "hummus",
  "beans",
  "rice",
  "fries",
  "tater",
  "zucchini",
  "cauliflower",
  "tomato",
  "lettuce",
  "spinach",
  "cucumber",
  "beets",
  "peppers",
  "grapes",
  "fruit",
  "soup",
  "salad",
  "noodles",
  "dressing",
];

function includesAny(name, terms) {
  return terms.some((term) => name.includes(term));
}

export function classifyMenuItem(name) {
  const lowered = name.toLowerCase();
  const dietary = [];
  let station = "Dining Item";

  if (lowered.includes("pizza")) {
    station = "Pizza";
  } else if (
    lowered.includes("fish") ||
    lowered.includes("tuna") ||
    lowered.includes("clam") ||
    lowered.includes("chicken") ||
    lowered.includes("turkey") ||
    lowered.includes("burger") ||
    lowered.includes("hamburger") ||
    lowered.includes("sandwich") ||
    lowered.includes("meatball")
  ) {
    station = "Grill";
  } else if (lowered.includes("soup") || lowered.includes("stew") || lowered.includes("chowder")) {
    station = "Soup";
  } else if (
    lowered.includes("lettuce") ||
    lowered.includes("spinach") ||
    lowered.includes("cucumber") ||
    lowered.includes("croutons") ||
    lowered.includes("feta") ||
    lowered.includes("caesar") ||
    lowered.includes("vinaigrette") ||
    lowered.includes("ranch") ||
    lowered.includes("mustard") ||
    lowered.includes("hummus")
  ) {
    station = "Salad Bar";
  } else if (
    lowered.includes("fries") ||
    lowered.includes("tater") ||
    lowered.includes("zucchini") ||
    lowered.includes("cauliflower") ||
    lowered.includes("rice") ||
    lowered.includes("beans") ||
    lowered.includes("noodles") ||
    lowered.includes("carrot") ||
    lowered.includes("beets") ||
    lowered.includes("peppers")
  ) {
    station = "Sides";
  } else if (lowered.includes("cookie") || lowered.includes("cake")) {
    station = "Dessert";
  } else if (
    lowered.includes("cheese") ||
    lowered.includes("egg") ||
    lowered.includes("dressing") ||
    lowered.includes("garbanzo") ||
    lowered.includes("tofu")
  ) {
    station = "Condiments";
  } else if (lowered.includes("naan") || lowered.includes("stir-fry")) {
    station = "Entrees";
  }

  if (includesAny(lowered, VEGAN_TERMS)) {
    dietary.push("Vegan", "Vegetarian");
  } else if (includesAny(lowered, VEGETARIAN_TERMS)) {
    dietary.push("Vegetarian");
  }

  if (
    includesAny(lowered, [
      "fries",
      "tater",
      "rice",
      "beans",
      "zucchini",
      "cauliflower",
      "tomato",
      "lettuce",
      "spinach",
      "cucumber",
      "beets",
      "peppers",
      "hummus",
      "vinaigrette",
      "salad",
      "soup",
      "stew",
      "chowder",
      "tofu",
      "grapes",
      "fruit",
      "sweet tomato soup",
      "zucchini & tomatoes",
      "red beans & rice",
    ])
  ) {
    dietary.push("Gluten Free");
  }

  return {
    station,
    dietary: [...new Set(dietary)],
  };
}
