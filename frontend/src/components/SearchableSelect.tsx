import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import './SearchableSelect.css'

export type SelectOption = {
  value: string
  label: string
  /** Texto menor ao lado do nome (ex.: a marca de um modelo, a posição de uma vaga). */
  hint?: string
  /** Opção que aparece, mas não pode ser escolhida (ex.: vaga ocupada). */
  disabled?: boolean
}

type Props = {
  id?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  /** A barra de pesquisa só aparece quando há mais opções que isso. */
  searchAfter?: number
  emptyText?: string
}

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Lista de seleção que ganha uma barra de pesquisa quando tem muitas opções. */
export function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Selecione',
  disabled = false,
  searchAfter = 7,
  emptyText = 'Nenhuma opção encontrada.',
}: Props) {
  const uid = useId()
  const listId = `${uid}-list`
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const selected = options.find((o) => o.value === value)
  const comBusca = options.length > searchAfter

  const visiveis = useMemo(() => {
    const q = normalizar(query.trim())
    if (!q) return options
    return options.filter((o) => normalizar(`${o.label} ${o.hint ?? ''}`).includes(q))
  }, [options, query])

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return
    function fora(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [open])

  useEffect(() => {
    if (open && comBusca) searchRef.current?.focus()
  }, [open, comBusca])

  function abrir() {
    if (disabled) return
    setQuery('')
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  function escolher(opcao: SelectOption) {
    onChange(opcao.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function teclas(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      // Fecha só a lista (sem fechar o pop-up que está por baixo).
      event.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) return abrir()
      setActive((i) => Math.min(visiveis.length - 1, i + 1))
    } else if (event.key === 'ArrowUp' && open) {
      event.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (event.key === 'Enter' && open) {
      event.preventDefault()
      const opcao = visiveis[active]
      if (opcao && !opcao.disabled) escolher(opcao)
    }
  }

  return (
    <div className="sselect" ref={rootRef} onKeyDown={teclas}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className="sselect-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : abrir())}
      >
        <span className={selected ? '' : 'sselect-placeholder'}>
          {selected ? selected.label : placeholder}
          {selected?.hint && <small> · {selected.hint}</small>}
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {open && (
        <div className="sselect-popover">
          {comBusca && (
            <label className="sselect-search">
              <Search size={14} aria-hidden="true" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActive(0)
                }}
                placeholder="Pesquisar…"
                aria-label="Pesquisar nas opções"
                autoComplete="off"
              />
            </label>
          )}
          <ul id={listId} role="listbox" className="sselect-list">
            {visiveis.map((opcao, i) => (
              <li
                key={opcao.value}
                role="option"
                aria-selected={opcao.value === value}
                aria-disabled={opcao.disabled || undefined}
                className={`${i === active ? 'active' : ''} ${opcao.value === value ? 'selected' : ''} ${opcao.disabled ? 'disabled' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => !opcao.disabled && escolher(opcao)}
              >
                {opcao.label}
                {opcao.hint && <small>{opcao.hint}</small>}
              </li>
            ))}
            {visiveis.length === 0 && <li className="sselect-empty">{emptyText}</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
