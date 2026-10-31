"use client";

import { useState } from "react";

export type IngredientOption = { id: string; name: string; unit: string; stockText: string };

/** Ingredient picker plus a quantity box that shows the right unit (kg / L / pcs). */
export default function IngredientQty({
  ingredients,
  qtyLabel,
  defaultId,
}: {
  ingredients: IngredientOption[];
  qtyLabel: string;
  defaultId?: string;
}) {
  const [id, setId] = useState(defaultId ?? "");
  const chosen = ingredients.find((i) => i.id === id);
  return (
    <>
      <label className="block">
        <span className="label">Ingredient</span>
        <select name="ingredientId" value={id} onChange={(e) => setId(e.target.value)} className="input" required>
          <option value="">Choose…</option>
          {ingredients.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} ({i.unit})
            </option>
          ))}
        </select>
        {chosen && <span className="mt-1 block text-xs text-muted">In stock now: {chosen.stockText}</span>}
      </label>
      <label className="block">
        <span className="label">{qtyLabel}</span>
        <div className="flex items-center gap-2">
          <input name="qty" inputMode="decimal" required className="input" placeholder="e.g. 2.5" />
          <span className="w-10 shrink-0 text-sm font-semibold text-muted">{chosen?.unit ?? ""}</span>
        </div>
      </label>
    </>
  );
}
