// Local-storage based suggestion box that feeds BOQ / Cost pages
// from items selected inside the Historical Pricing screen.

export interface HistoricalSuggestion {
  id: string;
  source_file_id: string;
  source_project_name: string;
  source_project_date: string | null;
  item_number: string;
  description: string;
  description_ar: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  added_at: string;
}

const KEY = "historical_suggestions";

export function getHistoricalSuggestions(): HistoricalSuggestion[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoricalSuggestion[]) : [];
  } catch {
    return [];
  }
}

export function addHistoricalSuggestion(s: Omit<HistoricalSuggestion, "id" | "added_at">) {
  const list = getHistoricalSuggestions();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const next = [{ ...s, id, added_at: new Date().toISOString() }, ...list].slice(0, 200);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("historical-suggestions-changed"));
  return next;
}

export function removeHistoricalSuggestion(id: string) {
  const list = getHistoricalSuggestions().filter((s) => s.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("historical-suggestions-changed"));
  return list;
}

export function clearHistoricalSuggestions() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("historical-suggestions-changed"));
}
