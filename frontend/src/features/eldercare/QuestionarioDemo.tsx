import React, { useEffect, useMemo, useState } from "react";
import "./QuestionarioDemo.css";
import { gerarPdfPlano } from "@/lib/gerarPdfPlano";

/* ================================================================
   Config
   ================================================================ */
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const USE_SSO =
  (import.meta.env.VITE_USE_PLATFORM_PROFILE ?? "false").toLowerCase() === "true";

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/* ================================================================
   Tipos
   ================================================================ */
type Step = "CADASTRO" | "QUESTIONARIO" | "PLANO";
type Sexo = "MASCULINO" | "FEMININO" | "OUTRO";

type Idoso = {
  id: number;
  nome: string;
  dataNascimento?: string | null;
  sexo?: Sexo | null;
  email?: string | null;
  telefone?: string | null;
};

type Resposta = { pergunta: string; resposta: string };

type PlanoDiaItem = {
  dia?: string;
  day?: string;
  diaSemana?: string;
  atividades: string[];
  _diaPt?: string;
};

type PlanoExercicio = {
  id?: number | null;
  nivel: string;
  duracaoSemanas: number;
  diasPorSemana: number;
  minutosPorDia: number;
  itens: PlanoDiaItem[];
  _raw?: any;
};

type PlatformProfile = {
  email?: string;
  name?: string;
  birthdate?: string;
  gender?: string;
  phone?: string;
};

type Question = { slug: string; label: string; options: string[] };

/* ================================================================
   Mapa de labels legíveis para as opções
   ================================================================ */
const OPTION_LABELS: Record<string, string> = {
  // Frequência geral
  nunca: "Nunca",
  raramente: "Raramente",
  as_vezes: "Às vezes",
  frequente: "Frequente",
  sempre: "Sempre",
  // Sim/Não
  sim: "Sim",
  nao: "Não",
  sim_controlada: "Sim, controlada",
  sim_nao_controlada: "Sim, não controlada",
  sim_ocasional: "Sim, ocasional",
  sim_diario: "Sim, diariamente",
  // Quantidade
  "1x": "1×/semana",
  "2x": "2×/semana",
  "3x": "3×/semana",
  "4x_ou_mais": "4×/semana ou mais",
  // Níveis
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
  // Quedas
  nenhuma: "Nenhuma",
  "1": "1 vez",
  "2oumais": "2 ou mais",
  "1oumais": "1 ou mais",
  // Levantar
  dificuldade: "Com dificuldade",
  nao_consegue: "Não consigo",
  // Equilíbrio
  "10oumais": "≥ 10 seg",
  "5a9": "5 a 9 seg",
  menos5: "< 5 seg",
  // Flexibilidade
  com_dificuldade: "Com dificuldade",
  // Hábitos
  "1a2_semana": "1–2×/semana",
  "3oumais_semana": "3+/semana",
  diario: "Diariamente",
  boa: "Boa",
  regular: "Regular",
  ruim: "Ruim",
  // Ar livre
  "1x_semana": "1×/semana",
  "2a3_semana": "2–3×/semana",
  "4oumais_semana": "4+/semana",
  // Social
  mensal: "Mensal",
  semanal: "Semanal",
  // Objetivos
  mobilidade: "Mobilidade",
  forca: "Força",
  equilibrio: "Equilíbrio",
  relaxar: "Relaxar",
  emagrecer: "Emagrecer",
  // Preferências
  individual: "Individual",
  grupo: "Em grupo",
  indiferente: "Indiferente",
  leve: "Leve",
  moderada: "Moderada",
  // Local
  casa: "Em casa",
  academia: "Academia",
  parque: "Parque",
  // Equipamentos
  nenhum: "Nenhum",
  halteres: "Halteres",
  elastico: "Elástico",
  halteres_e_elastico: "Halteres + Elástico",
  outros: "Outros",
  // Dias
  "2": "2 dias",
  "3": "3 dias",
  "4oumais": "4 ou mais",
  // Tempo
  "15": "15 min",
  "20": "20 min",
  "30": "30 min",
  "45": "45 min",
  "60": "60 min",
  // Horário
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
  // Coordenação
  leve_coord: "Leve",
  moderada_coord: "Moderada",
  grave: "Grave",
  leve: "Leve",
};

function label(opt: string): string {
  return OPTION_LABELS[opt] ?? opt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ================================================================
   Dados das perguntas
   ================================================================ */
const QUESTIONS: Question[] = [
  { slug: "cansaco_ativ_leves",         label: "Você sente cansaço em atividades leves?",         options: ["nunca", "as_vezes", "frequente"] },
  { slug: "adl_sem_ajuda",              label: "Realiza atividades do dia a dia sem ajuda?",       options: ["sim", "as_vezes", "nao"] },
  { slug: "atividade_freq_semana",      label: "Frequência de atividade física por semana",        options: ["nunca", "1x", "2x", "3x", "4x_ou_mais"] },
  { slug: "dores_articulares",          label: "Dores musculares/articulares com frequência?",     options: ["nao", "as_vezes", "frequente"] },
  { slug: "mobilidade_nivel",           label: "Como você avalia sua mobilidade?",                 options: ["baixo", "medio", "alto"] },

  { slug: "hipertensao",                label: "Tem hipertensão?",                                 options: ["nao", "sim_controlada", "sim_nao_controlada"] },
  { slug: "problema_cardiaco",          label: "Já teve problema cardíaco?",                       options: ["nao", "sim"] },
  { slug: "falta_ar_esforco_leve",      label: "Sente falta de ar em esforço leve?",              options: ["nunca", "as_vezes", "frequente"] },
  { slug: "medicacao_coracao_pressao",  label: "Usa medicação para coração/pressão?",             options: ["nao", "sim"] },
  { slug: "recomendacao_limitar_esforco", label: "Algum médico recomendou limitar esforço?",      options: ["nao", "sim"] },

  { slug: "inseguranca_caminhar",       label: "Sente insegurança ao caminhar?",                  options: ["nao", "as_vezes", "sim"] },
  { slug: "quedas_ultimo_ano",          label: "Quantas quedas no último ano?",                   options: ["nenhuma", "1", "2oumais"] },
  { slug: "levantar_sem_apoio",         label: "Consegue levantar da cadeira sem apoio?",         options: ["sim", "dificuldade", "nao_consegue"] },
  { slug: "equilibrio_unipodal",        label: "Equilíbrio em um pé (segundos)",                  options: ["10oumais", "5a9", "menos5"] },
  { slug: "dores_membros_tronco",       label: "Dores em membros ou tronco?",                     options: ["nao", "as_vezes", "frequente"] },

  { slug: "tocar_pes_sem_dobrar",       label: "Toca os pés sem dobrar os joelhos?",             options: ["sim", "com_dificuldade", "nao"] },
  { slug: "rigidez_ao_acordar",         label: "Sente rigidez ao acordar?",                       options: ["nao", "as_vezes", "frequente"] },
  { slug: "alonga_regularmente",        label: "Faz alongamento regularmente?",                   options: ["sim", "as_vezes", "nao"] },
  { slug: "dificuldade_coordenacao",    label: "Dificuldade de coordenação motora?",              options: ["nao", "leve", "moderada", "grave"] },
  { slug: "quer_melhorar_flexibilidade", label: "Deseja melhorar a flexibilidade?",               options: ["sim", "nao"] },

  { slug: "fuma",                       label: "Fuma?",                                            options: ["nao", "sim_ocasional", "sim_diario"] },
  { slug: "alcool_frequencia",          label: "Com que frequência consome álcool?",              options: ["nao", "1a2_semana", "3oumais_semana", "diario"] },
  { slug: "alimentacao_avaliacao",      label: "Como avalia sua alimentação?",                    options: ["boa", "regular", "ruim"] },
  { slug: "dorme_bem",                  label: "Dorme bem?",                                       options: ["sim", "as_vezes", "nao"] },
  { slug: "ativ_ao_ar_livre",           label: "Faz atividades ao ar livre?",                     options: ["nunca", "1x_semana", "2a3_semana", "4oumais_semana"] },

  { slug: "solidao_desmotivacao",       label: "Sente solidão ou desmotivação?",                 options: ["nunca", "as_vezes", "frequente"] },
  { slug: "participa_grupos_sociais",   label: "Participa de grupos sociais?",                   options: ["nunca", "mensal", "semanal"] },
  { slug: "estresse_ansiedade",         label: "Sente estresse ou ansiedade?",                   options: ["nunca", "as_vezes", "frequente"] },
  { slug: "diag_depressao",             label: "Tem diagnóstico de depressão?",                  options: ["nao", "sim"] },
  { slug: "prazer_exercicio",           label: "Sente prazer em se exercitar?",                  options: ["sim", "as_vezes", "nao"] },

  { slug: "objetivo_principal",         label: "Qual o seu objetivo principal?",                  options: ["mobilidade", "forca", "equilibrio", "relaxar", "emagrecer"] },
  { slug: "preferencia_social",         label: "Prefere treinar sozinho ou em grupo?",           options: ["individual", "grupo", "indiferente"] },
  { slug: "intensidade_preferida",      label: "Qual intensidade prefere?",                       options: ["leve", "moderada"] },
  { slug: "gosta_musica",               label: "Gosta de música durante o treino?",              options: ["sim", "nao"] },
  { slug: "local_preferido",            label: "Local preferido para exercícios",                 options: ["casa", "academia", "parque"] },

  { slug: "dias_por_semana",            label: "Quantos dias por semana pode treinar?",           options: ["1", "2", "3", "4oumais"] },
  { slug: "tempo_por_dia",              label: "Quanto tempo disponível por dia?",               options: ["15", "20", "30", "45", "60"] },
  { slug: "horario_preferido",          label: "Horário preferido",                               options: ["manha", "tarde", "noite"] },
  { slug: "equipamentos",               label: "Equipamentos disponíveis em casa",               options: ["nenhum", "halteres", "elastico", "halteres_e_elastico", "outros"] },
  { slug: "acomp_medico_ou_fisio",      label: "Tem acompanhamento médico ou de fisioterapeuta?", options: ["nao", "sim"] },
];

const CATEGORIES = [
  { id: "condicao",  title: "Condição física", emoji: "🧩",
    items: ["cansaco_ativ_leves","adl_sem_ajuda","atividade_freq_semana","dores_articulares","mobilidade_nivel"] },
  { id: "cardio",    title: "Saúde cardiovascular", emoji: "💓",
    items: ["hipertensao","problema_cardiaco","falta_ar_esforco_leve","medicacao_coracao_pressao","recomendacao_limitar_esforco"] },
  { id: "forca",     title: "Força e equilíbrio", emoji: "🏃",
    items: ["inseguranca_caminhar","quedas_ultimo_ano","levantar_sem_apoio","equilibrio_unipodal","dores_membros_tronco"] },
  { id: "flex",      title: "Flexibilidade", emoji: "🧘",
    items: ["tocar_pes_sem_dobrar","rigidez_ao_acordar","alonga_regularmente","dificuldade_coordenacao","quer_melhorar_flexibilidade"] },
  { id: "habitos",   title: "Hábitos de vida", emoji: "🍎",
    items: ["fuma","alcool_frequencia","alimentacao_avaliacao","dorme_bem","ativ_ao_ar_livre"] },
  { id: "mental",    title: "Saúde mental", emoji: "🧠",
    items: ["solidao_desmotivacao","participa_grupos_sociais","estresse_ansiedade","diag_depressao","prazer_exercicio"] },
  { id: "prefer",    title: "Objetivos", emoji: "🎯",
    items: ["objetivo_principal","preferencia_social","intensidade_preferida","gosta_musica","local_preferido"] },
  { id: "rotina",    title: "Rotina e disponibilidade", emoji: "⏱",
    items: ["dias_por_semana","tempo_por_dia","horario_preferido","equipamentos","acomp_medico_ou_fisio"] },
];

/* ================================================================
   Utilitários
   ================================================================ */
function parseJwt(token: string): any | null {
  try {
    const [, p] = token.split(".");
    if (!p) return null;
    return JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return null; }
}

function getPlatformProfileFromStorage(): PlatformProfile | null {
  const raw = localStorage.getItem("elder_profile");
  if (raw) { try { return JSON.parse(raw); } catch {} }
  for (const k of ["id_token", "access_token", "token"]) {
    const t = localStorage.getItem(k);
    if (!t) continue;
    const c = parseJwt(t);
    if (c && (c.email || c.name))
      return { email: c.email, name: c.name ?? [c.given_name, c.family_name].filter(Boolean).join(" "),
               birthdate: c.birthdate ?? c.dob, gender: c.gender ?? c.sexo, phone: c.phone_number ?? c.phone };
  }
  return null;
}

function mapGenderToSexo(g?: string): Sexo | undefined {
  if (!g) return undefined;
  const s = g.toLowerCase();
  if (["male","m","masculino"].includes(s)) return "MASCULINO";
  if (["female","f","feminino"].includes(s)) return "FEMININO";
  return "OUTRO";
}

function toActivitiesArray(src: any): string[] {
  if (!src) return [];
  if (Array.isArray(src))
    return src.map((x) => typeof x === "string" ? x.trim() : x?.nome ?? x?.name ?? JSON.stringify(x)).filter(Boolean);
  if (typeof src === "string") return src.split(/[;\n]/g).map((s) => s.trim()).filter(Boolean);
  return [];
}

const WEEK_ORDER = ["SEGUNDA-FEIRA","TERÇA-FEIRA","QUARTA-FEIRA","QUINTA-FEIRA","SEXTA-FEIRA","SÁBADO","DOMINGO"];

function mapWeekdayPtBr(raw?: string) {
  if (!raw) return "DIA";
  const s = raw.toLowerCase();
  if (s.includes("mon") || s.includes("segunda")) return "Segunda-feira";
  if (s.includes("tue") || s.includes("terca") || s.includes("terça")) return "Terça-feira";
  if (s.includes("wed") || s.includes("quarta")) return "Quarta-feira";
  if (s.includes("thu") || s.includes("quinta")) return "Quinta-feira";
  if (s.includes("fri") || s.includes("sexta")) return "Sexta-feira";
  if (s.includes("sat") || s.includes("sab")) return "Sábado";
  if (s.includes("sun") || s.includes("dom")) return "Domingo";
  return raw;
}

function weekdaySortIndex(pt: string) {
  const i = WEEK_ORDER.indexOf(pt.toUpperCase());
  return i >= 0 ? i : 99;
}

function calcIdade(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const h = new Date();
  let i = h.getFullYear() - d.getFullYear();
  const m = h.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && h.getDate() < d.getDate())) i--;
  return i;
}

function nivelClass(n: string) {
  const s = (n ?? "").toLowerCase();
  if (s.includes("baixo")) return "nivel-baixo";
  if (s.includes("medio") || s.includes("médio")) return "nivel-medio";
  if (s.includes("alto")) return "nivel-alto";
  return "";
}

function normalizePlano(raw: any): PlanoExercicio {
  const nivel = raw?.nivel ?? raw?.level ?? "personalizado";
  const duracaoSemanas = Number(raw?.duracaoSemanas ?? raw?.weeks ?? raw?.semanas ?? 4) || 4;
  const diasPorSemana  = Number(raw?.diasPorSemana ?? raw?.daysPerWeek ?? raw?.diasSemana ?? 3) || 3;
  const minutosPorDia  = Number(raw?.minutosPorDia ?? raw?.minutesPerDay ?? raw?.minDia ?? 30) || 30;
  const lista = Array.isArray(raw?.itens) ? raw.itens
    : Array.isArray(raw?.items) ? raw.items
    : Array.isArray(raw?.dias)  ? raw.dias : [];
  const itens: PlanoDiaItem[] = lista.map((i: any) => ({
    dia: i?.dia ?? i?.diaSemana ?? i?.day ?? "Dia",
    atividades: toActivitiesArray(i?.atividades ?? i?.exercicios ?? i?.exercises ?? i?.atividade),
  }));
  return { id: raw?.id ?? null, nivel, duracaoSemanas, diasPorSemana, minutosPorDia, itens, _raw: raw };
}

/* ================================================================
   COMPONENTE PRINCIPAL
   ================================================================ */
export default function QuestionarioDemo() {
  const [step, setStep]     = useState<Step>("CADASTRO");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [idosoId, setIdosoId] = useState<number | null>(null);
  const [plano, setPlano]   = useState<PlanoExercicio | null>(null);
  const [catIndex, setCatIndex] = useState(0);

  // cadastro
  const [nome, setNome]                 = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [sexo, setSexo]                 = useState<Sexo>("OUTRO");
  const [email, setEmail]               = useState("");
  const [telefone, setTelefone]         = useState("");

  // respostas
  const initial = useMemo(() => {
    const o: Record<string, string> = {};
    QUESTIONS.forEach((q) => (o[q.slug] = q.options[0]));
    return o;
  }, []);
  const [answers, setAnswers] = useState<Record<string, string>>(initial);

  const bySlug = useMemo(() => {
    const m: Record<string, Question> = {};
    QUESTIONS.forEach((q) => (m[q.slug] = q));
    return m;
  }, []);

  /* SSO */
  useEffect(() => {
    if (!USE_SSO) return;
    (async () => {
      const p = getPlatformProfileFromStorage();
      if (!p?.email) { setStep("CADASTRO"); return; }
      try {
        setLoading(true);
        setNome(p.name ?? ""); setEmail(p.email ?? "");
        if (p.birthdate) setDataNascimento(p.birthdate);
        const sx = mapGenderToSexo(p.gender);
        if (sx) setSexo(sx);
        if (p.phone) setTelefone(p.phone);
        const ensured = await apiPost<Idoso>("/api/eldercare/idosos/ensure", {
          nome: p.name ?? "Usuário", email: p.email!, dataNascimento: p.birthdate ?? null,
          sexo: sx ?? "OUTRO", telefone: p.phone ?? null,
        });
        setIdosoId(ensured.id); setCatIndex(0); setStep("QUESTIONARIO");
      } catch { setError("Não foi possível usar o login da plataforma. Preencha o cadastro."); setStep("CADASTRO"); }
      finally { setLoading(false); }
    })();
  }, []);

  /* Ações */
  async function handleCadastroSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const created = await apiPost<Idoso>("/api/eldercare/idosos", {
        nome, dataNascimento, sexo, email: email || null, telefone: telefone || null,
      });
      setIdosoId(created.id); setCatIndex(0); setStep("QUESTIONARIO");
    } catch (err: any) {
      setError(err?.message || "Falha ao salvar cadastro.");
    } finally { setLoading(false); }
  }

  async function handleGerarPlano() {
    if (!idosoId) { setError("Idoso não cadastrado."); return; }
    setLoading(true); setError(null);
    try {
      const respostas: Resposta[] = Object.entries(answers).map(([pergunta, resposta]) => ({ pergunta, resposta }));
      const raw = await apiPost<any>("/api/eldercare/questionario/gerar", { idosoId, respostas });
      setPlano(normalizePlano(raw)); setStep("PLANO");
    } catch (err: any) {
      setError(err?.message || "Erro ao gerar plano.");
    } finally { setLoading(false); }
  }

  const totalCats = CATEGORIES.length;
  const current   = CATEGORIES[catIndex];
  const isLast    = catIndex === totalCats - 1;

  const planoOrdenado = useMemo(() => {
    if (!plano) return null;
    const itens = (plano.itens ?? [])
      .map((d) => ({ ...d, _diaPt: mapWeekdayPtBr(d.dia ?? d.day ?? d.diaSemana) }))
      .sort((a, b) => weekdaySortIndex(a._diaPt || "") - weekdaySortIndex(b._diaPt || ""));
    return { ...plano, itens };
  }, [plano]);

  const idade = calcIdade(dataNascimento);

  function handleDownloadPdf() {
    if (!planoOrdenado) return;
    gerarPdfPlano({ nome, idade, sexo, nivel: planoOrdenado.nivel,
      duracaoSemanas: planoOrdenado.duracaoSemanas, diasPorSemana: planoOrdenado.diasPorSemana,
      minutosPorDia: planoOrdenado.minutosPorDia, itens: planoOrdenado.itens });
  }

  /* Rótulo do step */
  const stepLabel = step === "CADASTRO" ? "Cadastro"
    : step === "QUESTIONARIO" ? `${current.title} · ${catIndex + 1}/${totalCats}`
    : "Plano gerado";

  const stepIndex = step === "CADASTRO" ? 0 : step === "QUESTIONARIO" ? 1 : 2;

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="qc">
      {/* TOPBAR */}
      <div className="qc-topbar">
        <div className="qc-topbar__steps">
          {["Cadastro", "Questionário", "Plano"].map((s, i) => (
            <div
              key={s}
              className={`qc-step-dot ${i < stepIndex ? "done" : i === stepIndex ? "active" : ""}`}
            />
          ))}
        </div>
        <div className="qc-topbar__label">
          <span>{stepLabel}</span>
          {step === "QUESTIONARIO" && (
            <span style={{ color: "var(--ec-muted)", fontWeight: 400, fontSize: 12 }}>
              {Math.round((catIndex / (totalCats - 1)) * 100)}% concluído
            </span>
          )}
        </div>
      </div>

      {/* BODY */}
      <div className="qc-body">
        {error && (
          <div className="qc-banner warn">⚠️ {error}</div>
        )}
        {USE_SSO && (
          <div className="qc-banner info">ℹ️ Modo SSO ativo.</div>
        )}

        {/* ---- CADASTRO ------------------------------------------ */}
        {step === "CADASTRO" && (
          <div className="qc-card">
            <div className="qc-card__header">
              <h2 className="qc-card__title">Dados do Idoso</h2>
              <p className="qc-card__sub">Preencha as informações para criar o perfil</p>
            </div>

            <form onSubmit={handleCadastroSubmit} className="qc-form" noValidate>
              <div className="qc-field">
                <label className="qc-label" htmlFor="nome">Nome completo</label>
                <input
                  id="nome"
                  className="qc-input"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Maria Souza"
                  autoComplete="name"
                />
              </div>

              <div className="qc-row">
                <div className="qc-field" style={{ gridColumn: "span 1" }}>
                  <label className="qc-label" htmlFor="dataNasc">Data de nascimento</label>
                  <input
                    id="dataNasc"
                    className="qc-input"
                    required
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                  />
                </div>

                <div className="qc-field" style={{ gridColumn: "span 1" }}>
                  <label className="qc-label" htmlFor="sexo">Sexo</label>
                  <div className="qc-select-wrap">
                    <select
                      id="sexo"
                      className="qc-input"
                      value={sexo}
                      onChange={(e) => setSexo(e.target.value as Sexo)}
                    >
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMININO">Feminino</option>
                      <option value="OUTRO">Outro</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="qc-field">
                <label className="qc-label" htmlFor="email">E-mail</label>
                <input
                  id="email"
                  className="qc-input"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@dominio.com"
                  autoComplete="email"
                />
              </div>

              <div className="qc-field">
                <label className="qc-label" htmlFor="tel">Telefone <span style={{ fontWeight: 400, color: "var(--ec-muted)" }}>(opcional)</span></label>
                <input
                  id="tel"
                  className="qc-input"
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(62) 99999-0000"
                  autoComplete="tel"
                />
              </div>

              {/* ação inline para que o submit do form funcione */}
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
                {loading ? "Salvando…" : "Continuar →"}
              </button>
            </form>
          </div>
        )}

        {/* ---- QUESTIONÁRIO -------------------------------------- */}
        {step === "QUESTIONARIO" && (
          <div className="qc-card">
            {/* Progresso de categorias */}
            <div className="qc-cat-progress">
              {CATEGORIES.map((c, i) => (
                <div
                  key={c.id}
                  className={`qc-cat-pip ${i < catIndex ? "done" : i === catIndex ? "active" : ""}`}
                />
              ))}
            </div>

            {/* Cabeçalho da categoria */}
            <div className="qc-cat-header">
              <div className="qc-cat-emoji">{current.emoji}</div>
              <h3 className="qc-cat-title">{current.title}</h3>
              <span className="qc-cat-count">{catIndex + 1} / {totalCats}</span>
            </div>

            {/* Perguntas */}
            {current.items.map((slug) => {
              const q = bySlug[slug];
              if (!q) return null;
              const isLongOptions = q.options.some((o) => label(o).length > 12) || q.options.length > 4;
              return (
                <div key={slug} className="qc-question">
                  <div className="qc-question__label">{q.label}</div>
                  <div className="qc-options">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`qc-option${answers[q.slug] === opt ? " selected" : ""}${isLongOptions ? " full-width" : ""}`}
                        onClick={() => setAnswers((a) => ({ ...a, [slug]: opt }))}
                      >
                        {label(opt)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---- PLANO -------------------------------------------- */}
        {step === "PLANO" && planoOrdenado && (
          <div className="qc-card">
            {/* Hero */}
            <div className="plan-hero">
              <div className="plan-hero__title">Seu Plano de Exercícios</div>
              <div className="plan-hero__sub">Personalizado com base nas suas respostas</div>
              <div className={`plan-hero__badge ${nivelClass(planoOrdenado.nivel)}`}>
                Nível {planoOrdenado.nivel}
              </div>
            </div>

            {/* Chips do idoso */}
            <div className="plan-info-row">
              {nome    && <div className="plan-info-chip">👤 {nome}</div>}
              {idade   !== null && <div className="plan-info-chip">🎂 {idade} anos</div>}
              {sexo    && <div className="plan-info-chip">{sexo === "MASCULINO" ? "♂" : sexo === "FEMININO" ? "♀" : "⚥"} {sexo.charAt(0) + sexo.slice(1).toLowerCase()}</div>}
            </div>

            {/* Stats */}
            <div className="plan-stats">
              <div className="plan-stat">
                <div className="plan-stat__label">Duração</div>
                <div className="plan-stat__value">{planoOrdenado.duracaoSemanas}<span className="plan-stat__unit"> sem</span></div>
              </div>
              <div className="plan-stat">
                <div className="plan-stat__label">Dias/semana</div>
                <div className="plan-stat__value">{planoOrdenado.diasPorSemana}<span className="plan-stat__unit"> dias</span></div>
              </div>
              <div className="plan-stat">
                <div className="plan-stat__label">Minutos/dia</div>
                <div className="plan-stat__value">{planoOrdenado.minutosPorDia}<span className="plan-stat__unit"> min</span></div>
              </div>
              <div className="plan-stat">
                <div className="plan-stat__label">Total/semana</div>
                <div className="plan-stat__value">{planoOrdenado.diasPorSemana * planoOrdenado.minutosPorDia}<span className="plan-stat__unit"> min</span></div>
              </div>
            </div>

            {/* Cronograma */}
            <div className="plan-schedule">
              <div className="plan-schedule__title">📅 Cronograma semanal</div>
              {planoOrdenado.itens.map((d, idx) => (
                <div key={idx} className="day-card">
                  <div className="day-card__head">
                    <span className="day-card__icon">📘</span>
                    <span className="day-card__name">{d._diaPt}</span>
                  </div>
                  <div className="day-card__body">
                    {(d.atividades ?? []).length > 0
                      ? d.atividades.map((a, i) => (
                          <div key={i} className="day-card__item">{a}</div>
                        ))
                      : <div style={{ color: "var(--ec-muted)", fontSize: 14 }}>Sem atividades</div>
                    }
                  </div>
                </div>
              ))}
            </div>

            {/* Tips */}
            <div className="plan-tips">
              <div className="plan-tips__title">⚠️ Observações importantes</div>
              <div className="plan-tips__item">Inicie com 5–10 min de aquecimento leve.</div>
              <div className="plan-tips__item">Mantenha hidratação e faça pausas quando necessário.</div>
              <div className="plan-tips__item">Se sentir dor, tontura ou falta de ar, interrompa.</div>
              <div className="plan-tips__item">Consulte um profissional antes de iniciar.</div>
            </div>
          </div>
        )}
      </div>

      {/* ---- BARRA DE AÇÕES (FIXA) ----------------------------- */}
      <div className="qc-actions">
        {/* CADASTRO */}
        {step === "CADASTRO" && (
          <span style={{ fontSize: 13, color: "var(--ec-muted)", alignSelf: "center" }}>
            Preencha os dados acima
          </span>
        )}

        {/* QUESTIONÁRIO */}
        {step === "QUESTIONARIO" && (
          <>
            <button
              className="btn btn-ghost"
              onClick={() => catIndex === 0 ? setStep("CADASTRO") : setCatIndex((i) => i - 1)}
              disabled={loading}
            >
              ← Voltar
            </button>

            {!isLast ? (
              <button
                className="btn btn-primary"
                onClick={() => setCatIndex((i) => i + 1)}
                disabled={loading}
              >
                Continuar →
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleGerarPlano}
                disabled={loading}
              >
                {loading ? "Gerando…" : "✨ Gerar Plano"}
              </button>
            )}
          </>
        )}

        {/* PLANO */}
        {step === "PLANO" && (
          <>
            <button
              className="btn btn-ghost"
              onClick={() => { setPlano(null); setStep("QUESTIONARIO"); }}
            >
              Refazer
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => { setPlano(null); setIdosoId(null); setStep("CADASTRO"); }}
            >
              Novo
            </button>
            <div className="qc-actions__end">
              <button className="btn btn-primary" onClick={handleDownloadPdf}>
                📄 Baixar PDF
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
