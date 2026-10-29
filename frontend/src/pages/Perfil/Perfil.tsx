import { KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth, type User } from "../../auth/AuthContext";
import { api } from "../../api/client";
import "./Perfil.css";

export default function Perfil() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    api<User>("/contas/me")
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  if (!user) return null;
  if (error)
    return (
      <div className="perfil-page">
        <p role="alert">Não foi possível carregar o perfil: {error}</p>
        <button
          className="btn btn-outline"
          onClick={() => {
            setError("");
            setAttempt((v) => v + 1);
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  if (!profile) return <p role="status">Carregando perfil…</p>;
  const person = profile.funcionario?.pessoa;
  const address = person?.endereco;

  const fullName = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const displayName = person?.nome || fullName || profile.username;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="perfil-page">
      <section className="card perfil-summary" aria-label="Resumo do perfil">
        <span className="perfil-avatar" aria-hidden="true">
          {initial}
        </span>
        <div>
          <h2>{displayName}</h2>
          <p>@{user.username}</p>
        </div>
      </section>

      <section
        className="card perfil-section"
        aria-labelledby="perfil-info-title"
      >
        <div className="perfil-section-heading">
          <span className="perfil-icon" aria-hidden="true">
            <UserRound size={20} />
          </span>
          <div>
            <h2 id="perfil-info-title">Informações pessoais</h2>
            <p>Confira os dados da sua conta.</p>
          </div>
        </div>
        <dl className="perfil-details">
          <div>
            <dt>Nome completo</dt>
            <dd>{displayName}</dd>
          </div>
          <div>
            <dt>Nome de usuário</dt>
            <dd>{user.username}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>{person?.email || profile.email || "Não informado"}</dd>
          </div>
          <div>
            <dt>Telefone</dt>
            <dd>{person?.telefone || "Não informado"}</dd>
          </div>
          <div>
            <dt>CPF</dt>
            <dd>{person?.cpf_cnpj || "Não informado"}</dd>
          </div>
          <div>
            <dt>Data de nascimento</dt>
            <dd>
              {person?.data_nascimento
                ? person.data_nascimento.split("-").reverse().join("/")
                : "Não informada"}
            </dd>
          </div>
          {profile.funcionario && (
            <>
              <div>
                <dt>Cargo</dt>
                <dd>{profile.funcionario.cargo.nome}</dd>
              </div>
              <div>
                <dt>Setor</dt>
                <dd>{profile.funcionario.cargo.setor.nome}</dd>
              </div>
            </>
          )}
        </dl>
        {!person && (
          <p className="perfil-integration-hint">
            Esta conta não está vinculada a um funcionário.
          </p>
        )}
      </section>

      <section
        className="card perfil-section"
        aria-labelledby="perfil-address-title"
      >
        <h2 id="perfil-address-title">Endereço</h2>
        <dl className="perfil-details">
          <div>
            <dt>CEP</dt>
            <dd>{address?.cep || "Não informado"}</dd>
          </div>
          <div>
            <dt>Rua</dt>
            <dd>{address?.rua || "Não informada"}</dd>
          </div>
          <div>
            <dt>Número</dt>
            <dd>{address?.numero || "Não informado"}</dd>
          </div>
          <div>
            <dt>Complemento</dt>
            <dd>{address?.complemento || "Não informado"}</dd>
          </div>
          <div>
            <dt>Bairro</dt>
            <dd>{address?.bairro || "Não informado"}</dd>
          </div>
          <div>
            <dt>Cidade / UF</dt>
            <dd>
              {address ? `${address.cidade} / ${address.uf}` : "Não informada"}
            </dd>
          </div>
        </dl>
      </section>

      <section
        className="card perfil-section"
        aria-labelledby="perfil-security-title"
      >
        <div className="perfil-section-heading">
          <span className="perfil-icon" aria-hidden="true">
            <ShieldCheck size={20} />
          </span>
          <div>
            <h2 id="perfil-security-title">Segurança</h2>
            <p>Gerencie o acesso à sua conta.</p>
          </div>
        </div>
        <div className="perfil-password">
          <div>
            <h3>Senha</h3>
            <p id="perfil-password-hint">
              Defina uma nova senha para sua conta.
            </p>
          </div>
          <Link
            to="/perfil/senha"
            className="btn btn-outline"
            aria-describedby="perfil-password-hint"
          >
            <KeyRound size={16} aria-hidden="true" />
            Trocar senha
          </Link>
        </div>
      </section>
    </div>
  );
}
