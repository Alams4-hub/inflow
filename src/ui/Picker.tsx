// A dropdown that matches InFlow's look (the browser's built-in one can't be styled).
// Works with the keyboard: arrows to move, Enter to pick, Escape to close, typing to search.
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type PickerOption = { value: string; label: string; hint?: string };
export type PickerGroup = { label: string; note?: string; options: PickerOption[] };

type Props = {
  groups: PickerGroup[];
  value: string;
  onChange: (value: string) => void;
  label: string; // for screen readers
  searchable?: boolean; // show a search box (for long lists)
  width?: number | string;
};

export default function Picker({ groups, value, onChange, label, searchable = false, width = 440 }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  const all = groups.flatMap((g) => g.options);
  const selected = all.find((o) => o.value === value);

  // Options that match the search, still grouped.
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .map((g) => ({ ...g, options: q ? g.options.filter((o) => o.label.toLowerCase().includes(q)) : g.options }))
      .filter((g) => g.options.length > 0);
  }, [groups, query]);
  const flat = shown.flatMap((g) => g.options);
  // Where each group's options start in the flat list (for keyboard highlighting).
  const starts = shown.map((_, gi) => shown.slice(0, gi).reduce((n, g) => n + g.options.length, 0));

  // Close when clicking anywhere else.
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const openList = () => {
    setQuery("");
    setActive(Math.max(0, all.findIndex((o) => o.value === value)));
    setOpen(true);
    setTimeout(() => (searchable ? search.current : list.current)?.focus(), 0);
  };

  const choose = (option: PickerOption | undefined) => {
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    button.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(flat[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      button.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={root} className="picker" style={{ width: typeof width === "number" ? `min(${width}px, 100%)` : width }}>
      <button
        ref={button}
        type="button"
        className={`picker-button${open ? " open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${selected?.label ?? "choose"}`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            openList();
          }
        }}
      >
        <span className="picker-value">{selected?.label ?? "Choose..."}</span>
        <svg className="picker-chevron" width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <path d="M3 5.5 L7 9.5 L11 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="picker-panel" onKeyDown={onKey}>
          {searchable && (
            <input
              ref={search}
              className="picker-search"
              placeholder="Search..."
              aria-label={`Search ${label}`}
              aria-controls={`${id}-list`}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
            />
          )}
          <ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            aria-activedescendant={flat[active] ? `${id}-opt-${active}` : undefined}
            className="picker-list"
          >
            {shown.map((g, gi) => (
              <li key={g.label} role="presentation">
                <div className="picker-group">
                  {g.label}
                  {g.note && <span className="picker-note">{g.note}</span>}
                </div>
                <ul role="group" aria-label={g.label} style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {g.options.map((o, oi) => {
                    const i = starts[gi] + oi;
                    const isSelected = o.value === value;
                    return (
                      <li
                        key={o.value}
                        id={`${id}-opt-${i}`}
                        data-index={i}
                        role="option"
                        aria-selected={isSelected}
                        className={`picker-option${i === active ? " active" : ""}${isSelected ? " selected" : ""}`}
                        onMouseEnter={() => setActive(i)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => choose(o)}
                      >
                        <span>{o.label}</span>
                        {o.hint && <span className="picker-hint">{o.hint}</span>}
                        {isSelected && (
                          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="picker-check">
                            <path d="M2.5 7.5 L5.5 10.5 L11.5 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
            {flat.length === 0 && <li className="picker-empty">Nothing matches "{query}"</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
