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
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCuisineType, setEditCuisineType] = useState("");
  const [editIngredients, setEditIngredients] = useState<NewIngredient[]>([]);

  const isAdmin = true;

  const params = new URLSearchParams();
  if (search) params.set("q", search);

  const { data: dishes = [], isLoading } = useQuery({
    queryKey: ["recipes", search],
    queryFn: () => apiFetch<StandardDish[]>(`/api/recipes?${params.toString()}`),
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

  const updateMutation = useMutation({
    mutationFn: ({
      recipeId,
      body,
    }: {
      recipeId: string;
      body: { name: string; cuisineType: string; ingredients: NewIngredient[] };
    }) =>
      apiFetch(`/api/recipes/${recipeId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      setEditingId(null);
    },
    onError: () => {
      alert(t.recipes.updateFailed);
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
    },
  });

  const handleDelete = (recipeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t.recipes.confirmDelete)) {
      deleteMutation.mutate(recipeId);
    }
  };

  const handleEditClick = (dish: StandardDish, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(dish.id);
    setEditName(dish.name);
    setEditCuisineType(dish.cuisineType);
    setEditIngredients(
      dish.ingredients.length > 0
        ? dish.ingredients.map((ing) => ({
            ingredientName: ing.ingredientName,
            qty: ing.qty,
            unit: ing.unit,
          }))
        : [{ ingredientName: "", qty: 0, unit: "" }]
    );
    // Expand the card when editing
    setExpandedId(dish.id);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleSaveEdit = (recipeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const validIngredients = editIngredients.filter(
      (ing) => ing.ingredientName && ing.qty > 0 && ing.unit
    );
    if (!editName || !editCuisineType) return;
    updateMutation.mutate({
      recipeId,
      body: { name: editName, cuisineType: editCuisineType, ingredients: validIngredients },
    });
  };

  const updateEditIngredient = (
    idx: number,
    field: keyof NewIngredient,
    value: string | number
  ) => {
    setEditIngredients((prev) =>
      prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing))
    );
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
          {isAdmin && (
            <div className="relative group">
              <button
                className="flex items-center justify-center p-2 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                aria-label="Format Info"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <div className="absolute right-0 top-full mt-2 w-96 p-4 bg-white border border-slate-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-sm text-slate-600">
                <p className="font-semibold text-slate-800 mb-2">Import JSON Format:</p>
                <pre className="bg-slate-900 border border-slate-800 text-green-400 p-3 rounded-lg overflow-x-auto text-xs leading-relaxed font-mono">
{`[
  {
    "name": "ข้าวกะเพราหมูสับ",
    "ingredients": [
      {
        "name": "หมูสับ",
        "quantity": 100,
        "unit": "กรัม"
      },
      {
        "name": "ใบกะเพรา",
        "quantity": 10,
        "unit": "กรัม"
      }
    ]
  }
]`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <Input
          placeholder={t.common.search || "Search recipes..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
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
              {/* Card Header */}
              <div
                className="flex cursor-pointer items-center justify-between"
                onClick={() =>
                  editingId !== dish.id &&
                  setExpandedId(expandedId === dish.id ? null : dish.id)
                }
              >
                <div>
                  {editingId === dish.id ? (
                    <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="text-sm font-medium"
                        placeholder={t.recipes.dishName}
                      />
                      <Input
                        value={editCuisineType}
                        onChange={(e) => setEditCuisineType(e.target.value)}
                        className="text-sm"
                        placeholder={t.recipes.cuisineType}
                      />
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-slate-900">{dish.name}</p>
                      <p className="text-sm text-slate-500">{dish.cuisineType}</p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {editingId !== dish.id && (
                    <Badge>
                      {t.recipes.ingredientCount.replace(
                        "{count}",
                        String(dish._count.ingredients)
                      )}
                    </Badge>
                  )}
                  {isAdmin && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {editingId === dish.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={(e) => handleSaveEdit(dish.id, e)}
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? t.recipes.saving : t.recipes.saveDish}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                          >
                            {t.common.cancel}
                          </Button>
                        </>
                      ) : (
                        <>
                          {/* Edit button */}
                          <button
                            onClick={(e) => handleEditClick(dish, e)}
                            className="text-slate-400 hover:text-blue-600 rounded p-1 transition-colors"
                            title={t.recipes.editDish}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {/* Delete button */}
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
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded: view ingredients */}
              {expandedId === dish.id && editingId !== dish.id && (
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

              {/* Expanded: edit ingredients */}
              {editingId === dish.id && (
                <div className="mt-4 border-t pt-4" onClick={(e) => e.stopPropagation()}>
                  <p className="mb-3 text-sm font-semibold text-slate-700">
                    {t.recipes.ingredients}
                  </p>

                  <div className="space-y-2">
                    {/* Header row */}
                    <div className="grid grid-cols-[1fr_100px_100px_40px] gap-2 text-xs font-medium text-slate-500 px-1">
                      <span>{t.recipes.ingredientName}</span>
                      <span>{t.recipes.qty}</span>
                      <span>{t.recipes.unit}</span>
                      <span></span>
                    </div>

                    {editIngredients.map((ing, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_100px_100px_40px] gap-2 items-center">
                        <Input
                          placeholder={t.recipes.ingredientName}
                          value={ing.ingredientName}
                          onChange={(e) =>
                            updateEditIngredient(idx, "ingredientName", e.target.value)
                          }
                        />
                        <Input
                          placeholder={t.recipes.qty}
                          type="number"
                          step="0.1"
                          value={ing.qty || ""}
                          onChange={(e) =>
                            updateEditIngredient(idx, "qty", parseFloat(e.target.value) || 0)
                          }
                        />
                        <Input
                          placeholder={t.recipes.unit}
                          value={ing.unit}
                          onChange={(e) =>
                            updateEditIngredient(idx, "unit", e.target.value)
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEditIngredients((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="flex items-center justify-center w-8 h-8 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title={t.recipes.remove}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() =>
                      setEditIngredients((prev) => [
                        ...prev,
                        { ingredientName: "", qty: 0, unit: "" },
                      ])
                    }
                  >
                    {t.recipes.addIngredient}
                  </Button>

                  {updateMutation.isError && (
                    <p className="mt-2 text-sm text-red-600">{t.recipes.updateFailed}</p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
