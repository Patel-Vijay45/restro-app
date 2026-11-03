"use client";

import { useState } from "react";
import { saveRecipe } from "@/app/actions/stock";
import { rupees } from "@/lib/money";
import SubmitButton from "@/components/SubmitButton";

type Ingredient = { id: string; name: string; small: string; isPiece: boolean; costPerUnit: number };
type Line = { ingredientId: string; qty: string };

export default function RecipeEditor({
  menuItemId,
  price,
  ingredients,
  initial,
}: {
  menuItemId: string;
  price: number;
  ingredients: Ingredient[];
  initial: Line[];
}) {
  const [lines, setLines] = useState<Line[]>(initial.length ? initial : [{ ingredientId: "", qty: "" }]);
  const byId = new Map(ingredients.map((i) => [i.id, i]));

  // qty typed in g / ml (or pieces); cost per kg / L / piece
  const lineCost = (l: Line) => {
    const ing = byId.get(l.ingredientId);
    const n = parseFloat(l.qty);
    if (!ing || !(n > 0)) return 0;
    return Math.round(ing.isPiece ? n * ing.costPerUnit : (n * ing.costPerUnit) / 1000);
  };
  const cost = lines.reduce((s, l) => s + lineCost(l), 0);
  const pct = price > 0 ? Math.round((cost / price) * 100) : 0;

  function update(n: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, i) => (i === n ? { ...l, ...patch } : l)));
  }

  return (
    <form action={saveRecipe}>
      <input type="hidden" name="menuItemId" value={menuItemId} />
      <div className="card mb-3 divide-y divide-line">
        {lines.map((l, n) => {
          const ing = byId.get(l.ingredientId);
          return (
            <div key={n} className="flex items-center gap-2 p-3">
              <select
                name="ingredientId"
                value={l.ingredientId}
                onChange={(e) => update(n, { ingredientId: e.target.value })}
                className="input min-w-0 flex-1"
                aria-label="Ingredient"
              >
                <option value="">Choose…</option>
                {ingredients.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              <input
                name="qty"
                inputMode="decimal"
                value={l.qty}
                onChange={(e) => update(n, { qty: e.target.value })}
                className="input w-20 text-right"
                aria-label="Amount"
              />
              <span className="w-8 text-sm text-muted">{ing?.small ?? ""}</span>
              <button
                type="button"
                onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, i) => i !== n) : [{ ingredientId: "", qty: "" }]))}
                className="px-1 text-lg text-muted"
                aria-label="Remove row"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={() => setLines((ls) => [...ls, { ingredientId: "", qty: "" }])} className="btn-outline mb-4 w-full">
        + Add ingredient
      </button>

      <div className="card mb-4 grid grid-cols-3 divide-x divide-line text-center">
        <div className="p-3">
          <div className="text-xs text-muted">Cost to make</div>
          <div className="font-bold">{rupees(cost)}</div>
        </div>
        <div className="p-3">
          <div className="text-xs text-muted">Sells for</div>
          <div className="font-bold">{rupees(price)}</div>
        </div>
        <div className="p-3">
          <div className="text-xs text-muted">Food cost</div>
          <div className={`font-bold ${pct > 40 ? "text-nonveg" : "text-veg"}`}>{pct}%</div>
        </div>
      </div>
      <p className="mb-4 text-xs text-muted">Restaurants usually aim for a food cost of 25–35% of the selling price.</p>
      <SubmitButton className="btn-primary w-full">Save recipe</SubmitButton>
    </form>
  );
}
