"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/card";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Badge } from "@/components/badge";
import { useI18n } from "@/lib/i18n";

interface StandardDish {
  id: string;
  name: string;
  cuisineType: string;
  createdAt: string;
  _count: { ingredients: number };
  ingredients: {
    id: string;
    ingredientName: string;
    qty: number;
    unit: string;
  }[];
}

interface NewIngredient {
  ingredientName: string;
  qty: number;
  unit: string;
}

export default function RecipesPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [cuisineType, setCuisineType] = useState("");
  const [ingredients, setIngredients] = useState<NewIngredient[]>([
    { ingredientName: "", qty: 0, unit: "" },
  ]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: dishes = [], isLoading } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => apiFetch<StandardDish[]>("/api/recipes"),
  });

  const createMutation = useMutation({
    mutationFn: (body: {
      name: string;
      cuisineType: string;
      ingredients: NewIngredient[];
    }) =>
      apiFetch("/api/recipes", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      setShowForm(false);
      setName("");
      setCuisineType("");
      setIngredients([{ ingredientName: "", qty: 0, unit: "" }]);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validIngredients = ingredients.filter(
      (ing) => ing.ingredientName && ing.qty > 0 && ing.unit
    );
    if (!name || !cuisineType || validIngredients.length === 0) return;
    createMutation.mutate({ name, cuisineType, ingredients: validIngredients });
  };

  const updateIngredient = (
    idx: number,
    field: keyof NewIngredient,
    value: string | number
  ) => {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing))
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">{t.recipes.title}</h2>
        <Button onClick={() => setShowForm((p) => !p)}>
          {showForm ? t.common.cancel : t.recipes.addDish}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={t.recipes.dishName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label={t.recipes.cuisineType}
                value={cuisineType}
                onChange={(e) => setCuisineType(e.target.value)}
                required
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                {t.recipes.ingredients}
              </p>
              {ingredients.map((ing, idx) => (
                <div key={idx} className="mb-2 flex items-end gap-2">
                  <Input
                    placeholder={t.recipes.ingredientName}
                    value={ing.ingredientName}
                    onChange={(e) =>
                      updateIngredient(idx, "ingredientName", e.target.value)
                    }
                  />
                  <Input
                    placeholder={t.recipes.qty}
                    type="number"
                    step="0.1"
                    value={ing.qty || ""}
                    onChange={(e) =>
                      updateIngredient(idx, "qty", parseFloat(e.target.value) || 0)
                    }
                    className="w-24"
                  />
                  <Input
                    placeholder={t.recipes.unit}
                    value={ing.unit}
                    onChange={(e) =>
                      updateIngredient(idx, "unit", e.target.value)
                    }
                    className="w-24"
                  />
                  {ingredients.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setIngredients((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                    >
                      {t.recipes.remove}
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setIngredients((prev) => [
                    ...prev,
                    { ingredientName: "", qty: 0, unit: "" },
                  ])
                }
              >
                {t.recipes.addIngredient}
              </Button>
            </div>

            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending
                ? t.recipes.creating
                : t.recipes.createDish}
            </Button>
            {createMutation.isError && (
              <p className="text-sm text-red-600">{t.recipes.createFailed}</p>
            )}
          </form>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">{t.common.loading}</p>
      ) : (
        <div className="space-y-3">
          {dishes.map((dish) => (
            <Card key={dish.id}>
              <div
                className="flex cursor-pointer items-center justify-between"
                onClick={() =>
                  setExpandedId(expandedId === dish.id ? null : dish.id)
                }
              >
                <div>
                  <p className="font-medium text-slate-900">{dish.name}</p>
                  <p className="text-sm text-slate-500">{dish.cuisineType}</p>
                </div>
                <Badge>
                  {t.recipes.ingredientCount.replace(
                    "{count}",
                    String(dish._count.ingredients)
                  )}
                </Badge>
              </div>
              {expandedId === dish.id && (
                <div className="mt-3 border-t pt-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500">
                        <th className="pb-1">{t.recipes.ingredientName}</th>
                        <th className="pb-1">{t.recipes.qty}</th>
                        <th className="pb-1">{t.recipes.unit}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dish.ingredients.map((ing) => (
                        <tr key={ing.id} className="border-t border-slate-100">
                          <td className="py-1">{ing.ingredientName}</td>
                          <td className="py-1">{ing.qty}</td>
                          <td className="py-1">{ing.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
