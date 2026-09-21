import { useRef, useState } from 'react'
import { DayPicker, type DateRange as PickerRange } from 'react-day-picker'
import { ptBR } from 'react-day-picker/locale'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { useDismiss } from './useDismiss'
import 'react-day-picker/style.css'
import './DateRangePicker.css'

// Dates travel as YYYY-MM-DD strings, like the rest of the app
export type DateRange = { from: string; to: string }

function toDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toIso(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

function label(range: DateRange) {
  const from = shortDate.format(toDate(range.from))
  const to = shortDate.format(toDate(range.to))
  return range.from === range.to ? from : `${from} – ${to}`
}

function buildPresets(): { label: string; range: DateRange }[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const day = now.getDate()
  return [
    { label: 'Este mês', range: { from: toIso(new Date(year, month, 1)), to: toIso(new Date(year, month + 1, 0)) } },
    { label: 'Mês passado', range: { from: toIso(new Date(year, month - 1, 1)), to: toIso(new Date(year, month, 0)) } },
    { label: 'Próximo mês', range: { from: toIso(new Date(year, month + 1, 1)), to: toIso(new Date(year, month + 2, 0)) } },
    { label: 'Últimos 30 dias', range: { from: toIso(new Date(year, month, day - 29)), to: toIso(now) } },
    { label: 'Próximos 30 dias', range: { from: toIso(now), to: toIso(new Date(year, month, day + 29)) } },
    { label: 'Este ano', range: { from: toIso(new Date(year, 0, 1)), to: toIso(new Date(year, 11, 31)) } },
  ]
}

type DateRangePickerProps = {
  value: DateRange
  onChange: (range: DateRange) => void
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<PickerRange | undefined>()
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, () => setOpen(false))

  const presets = buildPresets()
  const thisYear = new Date().getFullYear()

  function toggle() {
    if (!open) setDraft({ from: toDate(value.from), to: toDate(value.to) })
    setOpen((v) => !v)
  }

  function apply(range: DateRange) {
    onChange(range)
    setOpen(false)
  }

  return (
    <div className="drp" ref={ref}>
      <button type="button" className="drp-trigger" aria-expanded={open} onClick={toggle}>
        <CalendarDays size={16} />
        <span>{label(value)}</span>
        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="drp-popover" role="dialog" aria-label="Selecionar período">
          <ul className="drp-presets">
            {presets.map((preset) => (
              <li key={preset.label}>
                <button
                  type="button"
                  className={preset.range.from === value.from && preset.range.to === value.to ? 'active' : ''}
                  onClick={() => apply(preset.range)}
                >
                  {preset.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="drp-main">
            <DayPicker
              mode="range"
              locale={ptBR}
              numberOfMonths={2}
              captionLayout="dropdown"
              startMonth={new Date(thisYear - 3, 0)}
              endMonth={new Date(thisYear + 3, 11)}
              defaultMonth={draft?.from}
              selected={draft}
              onSelect={setDraft}
            />

            <div className="drp-footer">
              <span>
                {draft?.from && draft?.to
                  ? label({ from: toIso(draft.from), to: toIso(draft.to) })
                  : draft?.from
                    ? 'Escolha a data final'
                    : 'Escolha a data inicial'}
              </span>
              <div>
                <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!draft?.from}
                  onClick={() => draft?.from && apply({ from: toIso(draft.from), to: toIso(draft.to ?? draft.from) })}
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
