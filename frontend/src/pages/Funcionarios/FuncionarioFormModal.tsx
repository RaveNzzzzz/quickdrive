import { useId, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import { Modal } from '../../components/Modal'
import type { CargoApi, FuncionarioApi, SetorApi } from './funcionariosData'

const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const regimes = [['CLT','CLT'],['PJ','PJ'],['ESTAGIARIO','Estagiário'],['JOVEM_APRENDIZ','Jovem Aprendiz'],['FREELANCER','Freelancer']]
const contas = [['CORRENTE','Corrente'],['POUPANCA','Poupança'],['SALARIO','Salário']]

function initial(employee?: FuncionarioApi): Record<string, string> {
  const p = employee?.pessoa
  const a = p?.endereco
  return {
    nome: p?.nome ?? '', email: p?.email ?? '', telefone: p?.telefone ?? '', cpf_cnpj: p?.cpf_cnpj ?? '',
    data_nascimento: p?.data_nascimento ?? '', rua: a?.rua ?? '', numero: a?.numero ?? '', complemento: a?.complemento ?? '',
    bairro: a?.bairro ?? '', cidade: a?.cidade ?? '', uf: a?.uf ?? '', cep: a?.cep ?? '',
    setor_id: employee ? String(employee.cargo.setor.id) : '',
    cargo_id: employee ? String(employee.cargo.id) : '', salario: employee ? String(employee.salario) : '',
    comissao: employee ? String(employee.comissao) : '0', data_admissao: employee?.data_admissao ?? '',
    inicio_expediente: employee?.inicio_expediente.slice(0,5) ?? '', final_expediente: employee?.final_expediente.slice(0,5) ?? '',
    regime_contratacao: employee?.regime_contratacao ?? 'CLT', banco: employee?.banco ?? '', agencia: employee?.agencia ?? '',
    numero_conta: employee?.numero_conta ?? '', tipo_conta: employee?.tipo_conta ?? 'CORRENTE', chave_pix: employee?.chave_pix ?? '',
  }
}

export function FuncionarioFormModal({ employee, cargos, setores, onClose, onSaved }: {
  employee?: FuncionarioApi; cargos: CargoApi[]; setores: SetorApi[]; onClose: () => void; onSaved: (saved: FuncionarioApi) => void
}) {
  const id = useId()
  const [values, setValues] = useState(() => initial(employee))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const cargosDoSetor = cargos.filter(c => String(c.setor.id) === values.setor_id)
  function update(key: string, value: string) {
    setValues(prev => ({ ...prev, [key]: value, ...(key === 'setor_id' ? { cargo_id: '' } : {}) }))
  }
  function field(key: string, label: string, type = 'text', optional = false, maxLength?: number, numeric?: { min: number; max?: number; step: string }) {
    const digits = ['telefone', 'cpf_cnpj', 'cep'].includes(key)
    return <label className="func-form-field" key={key}>
      <span>{label}{optional ? ' (opcional)' : ''}</span>
      <input type={type} required={!optional} value={values[key]} maxLength={maxLength}
        inputMode={digits ? 'numeric' : undefined} {...numeric}
        onChange={e => update(key, digits ? e.target.value.replace(/\D/g, '') : e.target.value)} />
    </label>
  }
  function select(key: string, label: string, options: string[][], disabled = false) {
    return <label className="func-form-field"><span>{label}</span>
      <select value={values[key]} required disabled={disabled} onChange={e => update(key, e.target.value)}>
        <option value="">Selecione</option>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setError('')
    if (!cargosDoSetor.some(c => String(c.id) === values.cargo_id)) {
      setError('Selecione o setor e um cargo pertencente a ele.'); return
    }
    if (!/^\d{11}$/.test(values.cpf_cnpj) || !/^\d{10,11}$/.test(values.telefone) || !/^\d{8}$/.test(values.cep)) {
      setError('Informe CPF com 11 dígitos, telefone com DDD (10 ou 11 dígitos) e CEP com 8 dígitos.'); return
    }
    if (Object.entries(values).some(([key, value]) => !['data_nascimento','complemento','chave_pix'].includes(key) && !value.trim())) {
      setError('Preencha todos os campos obrigatórios.'); return
    }
    const text = (key: string) => values[key].trim()
    const payload = {
      pessoa: {
        nome: text('nome'), email: text('email'), telefone: values.telefone, cpf_cnpj: values.cpf_cnpj,
        ...(!employee ? { tipo_pessoa: 'FISICA' } : {}), data_nascimento: values.data_nascimento || null,
        endereco: { rua: text('rua'), numero: text('numero'), complemento: text('complemento'), bairro: text('bairro'),
          cidade: text('cidade'), uf: values.uf, cep: values.cep },
      },
      cargo_id: Number(values.cargo_id), salario: values.salario, comissao: values.comissao,
      data_admissao: values.data_admissao, inicio_expediente: values.inicio_expediente, final_expediente: values.final_expediente,
      regime_contratacao: values.regime_contratacao, banco: text('banco'), agencia: text('agencia'),
      numero_conta: text('numero_conta'), tipo_conta: values.tipo_conta, chave_pix: text('chave_pix'),
    }
    setSaving(true)
    try {
      onSaved(await api<FuncionarioApi>(employee ? `/funcionarios/${employee.id}` : '/funcionarios', {
        method: employee ? 'PATCH' : 'POST', body: JSON.stringify(payload),
      }))
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.'); setSaving(false) }
  }
  return <Modal title={employee ? 'Editar funcionário' : 'Novo funcionário'} size="lg" busy={saving} onClose={onClose} footer={<>
    {error && <p className="func-error" role="alert">{error}</p>}
    <button className="btn btn-outline" disabled={saving} onClick={onClose}>Cancelar</button>
    <button className="btn btn-primary" form={id} type="submit" disabled={saving || !cargos.length}>{saving ? 'Salvando…' : 'Salvar'}</button>
  </>}>
    <form id={id} className="func-form" onSubmit={submit}>
      {!cargos.length && <p role="status">Cadastre um setor e cargo pelas opções “Ver setores” e “Ver cargos” antes de cadastrar funcionários.</p>}
      <fieldset disabled={saving}><legend>Dados pessoais</legend><div className="func-form-grid">
        {field('nome','Nome completo','text',false,200)}{field('email','E-mail','email',false,254)}
        {field('telefone','Telefone com DDD','tel',false,11)}{field('cpf_cnpj','CPF','text',false,11)}
        {field('data_nascimento','Data de nascimento','date',true)}
      </div></fieldset>
      <fieldset disabled={saving}><legend>Endereço</legend><div className="func-form-grid">
        {field('cep','CEP','text',false,8)}{field('rua','Rua','text',false,200)}{field('numero','Número','text',false,20)}
        {field('complemento','Complemento','text',true,200)}{field('bairro','Bairro','text',false,100)}
        {field('cidade','Cidade','text',false,100)}{select('uf','Estado',ufs.map(uf => [uf,uf]))}
      </div></fieldset>
      <fieldset disabled={saving}><legend>Contrato e remuneração</legend><div className="func-form-grid">
        {select('setor_id','Setor',setores.map(s => [String(s.id),s.nome]))}
        {select('cargo_id','Cargo',cargosDoSetor.map(c => [String(c.id),c.nome]), !values.setor_id || !cargosDoSetor.length)}
        {values.setor_id && !cargosDoSetor.length && <p role="status">Este setor não possui cargos cadastrados. Cadastre um cargo em “Ver cargos”.</p>}
        {select('regime_contratacao','Regime de contratação',regimes)}{field('data_admissao','Data de admissão','date')}
        {field('inicio_expediente','Início do expediente','time')}{field('final_expediente','Fim do expediente','time')}
        {field('salario','Salário (R$)','number',false,undefined,{min:0,step:'0.01'})}
        {field('comissao','Comissão (%)','number',false,undefined,{min:0,max:100,step:'0.01'})}
      </div></fieldset>
      <fieldset disabled={saving}><legend>Dados bancários</legend><div className="func-form-grid">
        {field('banco','Banco','text',false,100)}{field('agencia','Agência','text',false,20)}
        {field('numero_conta','Número da conta','text',false,20)}{select('tipo_conta','Tipo de conta',contas)}
        {field('chave_pix','Chave Pix','text',true,77)}
      </div></fieldset>
    </form>
  </Modal>
}
