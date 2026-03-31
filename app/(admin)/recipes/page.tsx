"use client";

import { useState } from "react";
import { useRef } from "react";
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
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Layout protects this route; we assume logged-in user is admin for this mock
  const isAdmin = true;

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

  const deleteMutation = useMutation({
    mutationFn: (recipeId: string) =>
      apiFetch(`/api/recipes/${recipeId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
    onError: () => {
      alert(t.recipes.deleteFailed);
    }
  });

  const handleDelete = (recipeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t.recipes.confirmDelete)) {
      deleteMutation.mutate(recipeId);
    }
  };

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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const response = await fetch("/api/recipes/import-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonText: text,
        }),
      });

      if (!response.ok) {
        throw new Error("Import failed");
      }

      const result = await response.json();
      alert(t.recipes.importSuccess.replace("{count}", String(result.count)));
      
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    } catch (error) {
      console.error("Import error:", error);
      alert(t.recipes.importError);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">{t.recipes.title}</h2>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleFileChange}
              />
              <Button
                variant="secondary"
                onClick={handleImportClick}
                isLoading={isImporting}
                className="flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {t.recipes.importJson}
              </Button>
            </>
          )}
          <Button onClick={() => setShowForm((p) => !p)}>
            {showForm ? t.common.cancel : t.recipes.addDish}
          </Button>
        </div>
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
                <div className="flex items-center gap-4">
                  <Badge>
                    {t.recipes.ingredientCount.replace(
                      "{count}",
                      String(dish._count.ingredients)
                    )}
                  </Badge>
                  {isAdmin && (
                    <button
                      onClick={(e) => handleDelete(dish.id, e)}
                      disabled={deleteMutation.isPending}
                      className="text-slate-400 hover:text-red-500 rounded p-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t.recipes.deleteDish}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
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
