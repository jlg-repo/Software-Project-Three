export function getFoodImage(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("pizza")) return "/food/pizza.jpg";
  if (n.includes("seasoned chicken")) return "/food/chicken.jpg";
  if (n.includes("diced")) return "/food/dicedchicken.jpg";
  if (n.includes("turkey")) return "/food/turkey.jpg";
  if (n.includes("fish")) return "/food/fish.jpg";
  if (n.includes("tuna")) return "/food/tuna.jpg";
  if (n.includes("clam")) return "/food/clam.jpg";
  if (n.includes("burger") || n.includes("hamburger") || n.includes("sandwich")) return "/food/burger.jpg";
  if (n.includes("salad") || n.includes("lettuce") || n.includes("spinach") || n.includes("cucumber")) return "/food/salad.jpg";
  if (n.includes("cookie") || n.includes("cake")) return "/food/dessert.jpg";
  if (n.includes("soup") || n.includes("stew") || n.includes("chowder")) return "/food/soup.jpg";
  if (n.includes("rice")) return "/food/rice.jpg";
  if (n.includes("beans")) return "/food/beans.jpg";
  if (n.includes("noodles")) return "/food/noodles.jpg";
  if (n.includes("cheese") || n.includes("feta")) return "/food/cheese.jpg";
  if (n.includes("tomato") || n.includes("zucchini") || n.includes("carrot") || n.includes("cauliflower") || n.includes("beets") || n.includes("peppers")) return "/food/veggie.jpg";
  if (n.includes("fries") || n.includes("tater")) return "/food/fries.jpg";
  if (n.includes("hummus") || n.includes("naan")) return "/food/naan.jpg";
  if (n.includes("dressing")) return "/food/dressings.jpg";
  if (n.includes("vinaigrette")) return "/food/vinaigrette.jpg";
  return "/food/default.jpg";
}
