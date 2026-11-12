import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import type { Paginated } from '../../types'

type Opcao = { id: number; pessoa: { nome: string } }

/**
 * Funcionário responsável pela compra de um lote.
 * Quem já tem funcionário vinculado compra em nome próprio (nada a escolher); o administrador
 * sem vínculo escolhe aqui. `value` vazio = não precisa enviar (usa o próprio usuário).
 */
export function useResponsavel() {
  const { user } = useAuth()
  const precisaEscolher = !user?.funcionario
  const [value, setValue] = useState('')
  return { precisaEscolher, value, setValue }
}

type Props = {
  id: string
  value: string
  onChange: (value: string) => void
}

export function ResponsavelSelect({ id, value, onChange }: Props) {
  const [funcionarios, setFuncionarios] = useState<Opcao[] | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let active = true
    api<Paginated<Opcao>>('/funcionarios?ativo=true&limit=1000')
      .then((r) => {
        if (active) setFuncionarios(r.items)
      })
      .catch((err: Error) => {
        if (active) setErro(err.message)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <>
      <label htmlFor={id}>Funcionário responsável pela compra</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="">{funcionarios === null && !erro ? 'Carregando…' : 'Selecione'}</option>
        {(funcionarios ?? []).map((f) => (
          <option key={f.id} value={f.id}>
            {f.pessoa.nome}
          </option>
        ))}
      </select>
      {erro && <p className="estoque-error">Não foi possível carregar os funcionários: {erro}</p>}
    </>
  )
}
