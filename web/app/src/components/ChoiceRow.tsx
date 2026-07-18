interface ChoiceOption<T extends string> {
  id: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  value: T;
  options: ChoiceOption<T>[];
  onChange: (id: T) => void;
  className?: string;
}

/** Segmented choice buttons — replaces native `<select>` in player UI. */
export function ChoiceRow<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
}: Props<T>) {
  return (
    <div
      className={`choice-row ${className}`.trim()}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={value === opt.id}
          className={value === opt.id ? "on" : ""}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
