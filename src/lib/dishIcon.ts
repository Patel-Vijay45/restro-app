/** A food icon for dishes without a photo, picked from the dish and category names. */
const RULES: [RegExp, string][] = [
  [/biryani|pulao|rice/i, "🍛"],
  [/fries/i, "🍟"],
  [/roll|shawarma|wrap|frankie/i, "🌯"],
  [/puff|samosa/i, "🥟"],
  [/fish|prawn/i, "🐟"],
  [/egg|omelet/i, "🍳"],
  [/chicken|kabab|kebab|tikka|65|wings/i, "🍗"],
  [/mutton|lamb/i, "🍖"],
  [/naan|roti|chapati|paratha|bread|kulcha/i, "🫓"],
  [/dal|curry|masala|gravy|korma|sabzi|main/i, "🍲"],
  [/paneer|gobi|manchurian|veg|starter/i, "🥘"],
  [/lassi|coffee|shake|milk|tea|chai/i, "🥤"],
  [/soda|lime|juice|drink|water|cola/i, "🍹"],
  [/ice cream|dessert|sweet|halwa|jamun/i, "🍨"],
];

export function dishIcon(name: string, category = ""): string {
  for (const [re, icon] of RULES) if (re.test(name)) return icon;
  for (const [re, icon] of RULES) if (re.test(category)) return icon;
  return "🍽️";
}
