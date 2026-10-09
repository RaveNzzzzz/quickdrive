import { useId, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import { Modal } from '../../components/Modal'
import type { FuncionarioApi } from './funcionariosData'

export function DesligamentoModal({ employee, onClose, onSaved }: {
  employee: FuncionarioApi; onClose: () => void; onSaved: (employee: FuncionarioApi) => void
}) {
  const id = useId()
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    if (!reason.trim()) { setError('Informe o motivo do desligamento.'); return }
    setSaving(true); setError('')
    try {
      onSaved(await api<FuncionarioApi>(`/funcionarios/${employee.id}/desligar`, {
        method: 'POST', body: JSON.stringify({ data_desligamento: date, motivo: reason.trim(), observacoes: notes.trim() }),
      }))
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível desligar.'); setSaving(false) }
  }
  return <Modal title={`Desligar ${employee.pessoa.nome}`} busy={saving} onClose={onClose} footer={<>
    {error && <p className="func-error" role="alert">{error}</p>}
    <button className="btn btn-outline" disabled={saving} onClick={onClose}>Cancelar</button>
    <button className="btn btn-primary" type="submit" form={id} disabled={saving}>{saving ? 'Confirmando…' : 'Confirmar desligamento'}</button>
  </>}>
    <form id={id} className="func-form" onSubmit={submit}>
      <p>O funcionário será mantido no histórico. A conta vinculada perderá acesso ao sistema.</p>
      <fieldset disabled={saving}>
        <label className="func-form-field"><span>Data de desligamento</span><input required type="date" min={employee.data_admissao} value={date} onChange={e => setDate(e.target.value)} /></label>
        <label className="func-form-field"><span>Motivo</span><input required maxLength={200} value={reason} onChange={e => setReason(e.target.value)} /></label>
        <label className="func-form-field"><span>Observações (opcional)</span><textarea value={notes} onChange={e => setNotes(e.target.value)} /></label>
      </fieldset>
    </form>
  </Modal>
}
