import { Field } from '@/components/ui'
import { FILTER_PRESETS, type FilterId } from '@/lib/pdf/filters'

/** Preset picker for raster image filters. */
export function FilterSelect({
  value,
  onChange,
  id = 'filter-preset',
  label = 'Filter',
}: {
  value: FilterId
  onChange: (value: FilterId) => void
  id?: string
  label?: string
}) {
  const active = FILTER_PRESETS.find((preset) => preset.id === value)
  return (
    <Field label={label} htmlFor={id} hint={active?.description}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as FilterId)}
        className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 text-sm outline-none focus:border-accent"
      >
        {FILTER_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
      </select>
    </Field>
  )
}
