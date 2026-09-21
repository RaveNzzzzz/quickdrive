import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react'
import { Car, Plus, Search, X } from 'lucide-react'
import {
  funilOwners,
  funilSources,
  funilStages,
  initialFunilCards,
  staleThresholdDays,
  type FunilCard,
  type FunilStageId,
} from './funilClientesData'
import './FunilClientes.css'

const STORAGE_KEY = 'quickdrive:funil'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

function compactCurrency(value: number) {
  return `R$${Math.round(value / 1000)}k`
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.charAt(0) ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : (parts[0]?.charAt(1) ?? '')
  return (first + last).toUpperCase()
}

function loadCards(): FunilCard[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved) as FunilCard[]
  } catch {
    // storage unavailable or corrupted: fall back to the seed data
  }
  return initialFunilCards
}

type FormState = {
  name: string
  source: string
  vehicle: string
  value: string
  owner: string
  stage: FunilStageId
  nextStep: string
}

function emptyForm(stage: FunilStageId): FormState {
  return {
    name: '',
    source: funilSources[0],
    vehicle: '',
    value: '',
    owner: funilOwners[0],
    stage,
    nextStep: '',
  }
}

export default function FunilClientes() {
  const [cards, setCards] = useState<FunilCard[]>(loadCards)
  const [query, setQuery] = useState('')
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [overStage, setOverStage] = useState<FunilStageId | null>(null)
  const [overCardId, setOverCardId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
    } catch {
      // ignore: persistence is a convenience only
    }
  }, [cards])

  const visibleCards = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cards
    return cards.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.vehicle.toLowerCase().includes(q) ||
        c.source.toLowerCase().includes(q) ||
        c.owner.toLowerCase().includes(q),
    )
  }, [cards, query])

  const active = cards.filter((c) => c.stage !== 'vendido')
  const activeValue = active.reduce((sum, c) => sum + c.value, 0)

  function moveCard(id: number, stage: FunilStageId, beforeId: number | null) {
    setCards((prev) => {
      const moving = prev.find((c) => c.id === id)
      if (!moving || id === beforeId) return prev

      const moved: FunilCard =
        moving.stage === stage ? moving : { ...moving, stage, daysInStage: 0 }
      const rest = prev.filter((c) => c.id !== id)

      const beforeIndex = beforeId === null ? -1 : rest.findIndex((c) => c.id === beforeId)
      if (beforeIndex === -1) {
        // Append after the last card of the target column
        let lastIndex = -1
        rest.forEach((c, i) => {
          if (c.stage === stage) lastIndex = i
        })
        rest.splice(lastIndex + 1, 0, moved)
      } else {
        rest.splice(beforeIndex, 0, moved)
      }
      return rest
    })
  }

  function endDrag() {
    setDraggingId(null)
    setOverStage(null)
    setOverCardId(null)
  }

  function handleDragStart(e: DragEvent, id: number) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(id))
    setDraggingId(id)
  }

  function handleColumnDragOver(e: DragEvent, stage: FunilStageId) {
    if (draggingId === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverStage(stage)
  }

  function handleCardDragOver(e: DragEvent, stage: FunilStageId, cardId: number) {
    if (draggingId === null) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setOverStage(stage)
    setOverCardId(cardId)
  }

  function handleDrop(e: DragEvent, stage: FunilStageId, beforeId: number | null) {
    e.preventDefault()
    e.stopPropagation()
    if (draggingId !== null) moveCard(draggingId, stage, beforeId)
    endDrag()
  }

  function submitForm(e: FormEvent) {
    e.preventDefault()
    if (!form) return

    const value = Number(form.value.replace(/\./g, '').replace(',', '.'))
    const nextId = cards.reduce((max, c) => Math.max(max, c.id), 0) + 1

    setCards((prev) => [
      ...prev,
      {
        id: nextId,
        stage: form.stage,
        name: form.name.trim(),
        source: form.source,
        vehicle: form.vehicle.trim(),
        value: Number.isFinite(value) ? value : 0,
        daysInStage: 0,
        owner: form.owner,
        nextStep: form.nextStep.trim() || 'Definir próximo passo',
      },
    ])
    setForm(null)
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  return (
    <div className="funil-page">
      <div className="funil-toolbar">
        <div className="funil-toolbar-left">
          <label className="funil-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cliente, veículo ou vendedor"
            />
          </label>
          <p className="funil-summary">
            {active.length} clientes ativos · {currency.format(activeValue)} em negociação
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setForm(emptyForm('interesse'))}>
          <Plus size={16} />
          Novo cliente
        </button>
      </div>

      <div className="funil-board">
        {funilStages.map((stage) => {
          const columnCards = visibleCards.filter((c) => c.stage === stage.id)
          const total = columnCards.reduce((sum, c) => sum + c.value, 0)
          const isOver = overStage === stage.id && draggingId !== null

          return (
            <section
              key={stage.id}
              className={`funil-column ${isOver ? 'funil-column-over' : ''}`}
              onDragOver={(e) => handleColumnDragOver(e, stage.id)}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setOverStage((s) => (s === stage.id ? null : s))
                  setOverCardId(null)
                }
              }}
              onDrop={(e) => handleDrop(e, stage.id, null)}
            >
              <header className="funil-column-header">
                <div className="funil-column-title">
                  <span className="funil-dot" style={{ background: stage.color }} />
                  <h3>{stage.title}</h3>
                  <span className="funil-count">{columnCards.length}</span>
                </div>
                <div className="funil-column-total">
                  <strong>{compactCurrency(total)}</strong>
                  <span>{stage.helper}</span>
                </div>
              </header>

              <div className="funil-cards">
                {columnCards.map((card) => {
                  const stale = card.stage !== 'vendido' && card.daysInStage >= staleThresholdDays
                  return (
                    <article
                      key={card.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, card.id)}
                      onDragEnd={endDrag}
                      onDragOver={(e) => handleCardDragOver(e, stage.id, card.id)}
                      onDrop={(e) => handleDrop(e, stage.id, card.id)}
                      className={[
                        'funil-card',
                        stale ? 'funil-card-stale' : '',
                        draggingId === card.id ? 'funil-card-dragging' : '',
                        overCardId === card.id && draggingId !== card.id ? 'funil-card-drop-before' : '',
                      ].join(' ')}
                    >
                      <div className="funil-card-head">
                        <span className="funil-avatar">{initials(card.name)}</span>
                        <div className="funil-card-person">
                          <strong>{card.name}</strong>
                          <span>{card.source}</span>
                        </div>
                        {stale && (
                          <span className="funil-alert" title="Parado há muito tempo nesta etapa">
                            !
                          </span>
                        )}
                      </div>

                      <div className="funil-vehicle">
                        <Car size={14} />
                        {card.vehicle}
                      </div>

                      <div className="funil-card-row">
                        <strong className="funil-price">{currency.format(card.value)}</strong>
                        <span className={stale ? 'funil-danger' : ''}>
                          {card.daysInStage === 0 ? 'hoje' : `${card.daysInStage}d nesta etapa`}
                        </span>
                      </div>

                      <div className="funil-card-footer">
                        <span>{card.owner}</span>
                        <span className={stale ? 'funil-danger' : 'funil-next'}>{card.nextStep}</span>
                      </div>
                    </article>
                  )
                })}
              </div>

              <button type="button" className="funil-add" onClick={() => setForm(emptyForm(stage.id))}>
                <Plus size={14} />
                Adicionar
              </button>
            </section>
          )
        })}
      </div>

      {form && (
        <div className="funil-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}>
          <form className="funil-modal card" onSubmit={submitForm} role="dialog" aria-modal="true" aria-label="Novo cliente">
            <div className="funil-modal-header">
              <h2>Novo cliente</h2>
              <button type="button" className="icon-btn" aria-label="Fechar" onClick={() => setForm(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="funil-form-grid">
              <label className="funil-field funil-field-full">
                Nome do cliente
                <input required autoFocus value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
              </label>

              <label className="funil-field">
                Origem
                <select value={form.source} onChange={(e) => updateForm('source', e.target.value)}>
                  {funilSources.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>

              <label className="funil-field">
                Vendedor
                <select value={form.owner} onChange={(e) => updateForm('owner', e.target.value)}>
                  {funilOwners.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>

              <label className="funil-field funil-field-full">
                Veículo de interesse
                <input required value={form.vehicle} onChange={(e) => updateForm('vehicle', e.target.value)} />
              </label>

              <label className="funil-field">
                Valor da proposta (R$)
                <input
                  required
                  inputMode="decimal"
                  placeholder="189900"
                  value={form.value}
                  onChange={(e) => updateForm('value', e.target.value)}
                />
              </label>

              <label className="funil-field">
                Etapa
                <select value={form.stage} onChange={(e) => updateForm('stage', e.target.value as FunilStageId)}>
                  {funilStages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="funil-field funil-field-full">
                Próximo passo
                <input
                  placeholder="Ex.: Ligar amanhã 10h"
                  value={form.nextStep}
                  onChange={(e) => updateForm('nextStep', e.target.value)}
                />
              </label>
            </div>

            <div className="funil-modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setForm(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Salvar cliente
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
