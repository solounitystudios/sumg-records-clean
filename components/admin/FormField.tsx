"use client";

interface BaseFieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

interface TextFieldProps extends BaseFieldProps {
  type?: "text" | "url" | "email" | "date" | "datetime-local" | "number";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
}

interface TextareaFieldProps extends BaseFieldProps {
  type: "textarea";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

interface SelectFieldProps extends BaseFieldProps {
  type: "select";
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

interface ToggleFieldProps extends BaseFieldProps {
  type: "toggle";
  value: boolean;
  onChange: (value: boolean) => void;
}

type FormFieldProps =
  | TextFieldProps
  | TextareaFieldProps
  | SelectFieldProps
  | ToggleFieldProps;

const labelClass =
  "block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2";
const inputClass =
  "w-full bg-transparent border border-white/10 px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors duration-200";
const hintClass = "mt-1.5 text-[10px] text-white/20";
const errorClass = "mt-1.5 text-[10px] text-red-400";

export function FormField(props: FormFieldProps) {
  const { label, hint, error, required, className = "" } = props;

  return (
    <div className={`space-y-0 ${className}`}>
      <label className={labelClass}>
        {label}
        {required && <span className="text-red-400/70 ml-1">*</span>}
      </label>

      {props.type === "textarea" ? (
        <textarea
          rows={props.rows ?? 4}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          className={`${inputClass} resize-none`}
        />
      ) : props.type === "select" ? (
        <select
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className={`${inputClass} cursor-pointer`}
        >
          {props.options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-neutral-900">
              {opt.label}
            </option>
          ))}
        </select>
      ) : props.type === "toggle" ? (
        <button
          type="button"
          role="switch"
          aria-checked={props.value}
          onClick={() => props.onChange(!props.value)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
            props.value ? "bg-white/40" : "bg-white/10"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200 ${
              props.value ? "translate-x-[18px]" : "translate-x-[2px]"
            }`}
          />
        </button>
      ) : (
        <input
          type={props.type ?? "text"}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          className={`${inputClass}${props.mono ? " font-mono text-xs" : ""}`}
        />
      )}

      {hint && !error && <p className={hintClass}>{hint}</p>}
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}

/** Inline label + value display for read-only fields */
export function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 py-2.5 border-b border-white/[0.04]">
      <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 w-28 flex-shrink-0 pt-0.5">
        {label}
      </p>
      <p className="text-xs text-white/60 flex-1">{value || "—"}</p>
    </div>
  );
}

/** A section heading used inside admin forms */
export function FormSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-5 ${className}`}>
      <div className="border-b border-white/5 pb-2">
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/30">{title}</p>
      </div>
      {children}
    </div>
  );
}

/** Primary save button */
export function SaveButton({
  onClick,
  label = "Save",
  saving = false,
  disabled = false,
}: {
  onClick?: () => void;
  label?: string;
  saving?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={disabled || saving}
      className="bg-white text-black text-[10px] tracking-[0.25em] uppercase px-8 py-3 font-semibold hover:bg-white/90 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {saving ? "Saving…" : label}
    </button>
  );
}

/** Danger/destructive button */
export function DangerButton({
  onClick,
  label = "Delete",
  disabled = false,
}: {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border border-red-900/50 text-red-400/70 text-[10px] tracking-[0.2em] uppercase px-6 py-3 hover:border-red-500/60 hover:text-red-400 transition-colors duration-200 disabled:opacity-40"
    >
      {label}
    </button>
  );
}

/** Status badge chip */
export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    published: "text-green-400/80 border-green-800/50",
    active: "text-green-400/80 border-green-800/50",
    draft: "text-white/35 border-white/10",
    scheduled: "text-yellow-400/80 border-yellow-800/50",
    archived: "text-white/20 border-white/5",
  };
  return (
    <span
      className={`border px-2 py-0.5 text-[9px] tracking-[0.2em] uppercase ${
        colors[status] ?? "text-white/30 border-white/10"
      }`}
    >
      {status}
    </span>
  );
}
