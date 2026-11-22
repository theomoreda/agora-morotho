# Prosa — companhia por voz que percebe quando algo mudou

> **O Prosa não faz diagnóstico.** Ele conversa todo dia com a pessoa idosa e
> avisa a família quando algo mudou **em relação a ela mesma**.

Projeto do hackathon **UNMUTE · by Agora** (NewHack + Agora), São Paulo,
21–22 de novembro de 2026. Trilha: Agentes.

**Versão entregue: `v1.0-hackathon`**

---

## Índice

1. [O problema](#1-o-problema)
2. [A solução](#2-a-solução)
3. [Onde entra a Agora](#3-onde-entra-a-agora)
4. [Arquitetura](#4-arquitetura)
5. [Como rodar](#5-como-rodar)
6. [Dependências](#6-dependências)
7. [Preexistente × feito no hackathon](#7-preexistente--feito-no-hackathon)
8. [Dados simulados](#8-dados-simulados)
9. [Validação](#9-validação)
10. [LGPD e ética](#10-lgpd-e-ética)
11. [Limitações](#11-limitações)
12. [Licenças](#12-licenças)
13. [Roadmap](#13-roadmap)

---

## 1. O problema

**32.113.490 pessoas** com 60 anos ou mais no Brasil — 15,6% da população,
alta de 56% desde 2010 (Censo 2022, IBGE).

A OMS associa isolamento social e solidão a um aumento de **14% a 32% no risco
de mortalidade**, além de maior risco de AVC, doença cardiovascular, depressão
e demência. Cerca de **11,8% dos idosos** relatam solidão.

E há um segundo fato: **sinais de mudança aparecem na fala antes do
diagnóstico**. Uma meta-análise de 2025 (BMJ Evidence-Based Medicine, 96
estudos, 20 doenças) encontrou sensibilidade de **0,85** e especificidade de
**0,83** para condições cognitivas — com a ressalva explícita dos autores de
que a voz serve para **triagem e monitoramento**, não para diagnóstico.

**Quem sofre com isso:** a pessoa idosa que passa o dia sozinha, e a família
que mora longe e só descobre que algo mudou quando já é tarde.

## 2. A solução

**Clara**, uma companhia por voz em português do Brasil. Ela conversa todos os
dias — bate-papo, memórias, família. Dentro da conversa entram três
**brincadeiras** (nunca chamadas de "teste"):

| Brincadeira | O que é | O que mede |
|---|---|---|
| As três palavrinhas | Guardar 3 palavras no começo, lembrar no fim | memória |
| O minuto dos bichos | Falar o máximo de bichos em 1 minuto | fluência verbal |
| O dia de hoje | "Que dia da semana é hoje?" | orientação |

De cada conversa o Prosa extrai **10 medidas** — de voz e de texto — e compara
com a **linha de base da própria pessoa** (as 5 primeiras conversas):

| Tipo | Medida | Sinal de mudança |
|---|---|---|
| Voz | Velocidade de articulação (sílabas/s) | ↓ lentificação |
| Voz | Proporção de tempo em pausas | ↑ |
| Voz | Duração média das pausas | ↑ |
| Voz | Variação do tom (semitons) | ↓ monotonia |
| Voz | Jitter, shimmer | ↑ irregularidade |
| Voz | HNR | ↓ clareza |
| Texto | Palavras por turno | ↓ |
| Texto | Variedade de vocabulário (MATTR) | ↓ |
| Tarefa | Bichos diferentes no minuto | ↓ |

Semáforo no painel da família:

| | Quando | O que a família lê |
|---|---|---|
| ⚪ calibrando | menos de 5 conversas | "Ainda conhecendo o jeito dela de falar" |
| 🟢 verde | dentro do padrão dela | "Dentro do normal dela" |
| 🟡 amarelo | 3+ medidas pioram ≥2,5 desvios **e** ≥10% | "Algo mudou hoje" |
| 🔴 vermelho | o amarelo se repete na conversa seguinte | "Vale procurar um profissional" |

A mensagem é sempre descritiva — *"duração das pausas +55%, tempo em pausas
+72%"* — **nunca** um nome de doença.

### Por que comparar a pessoa com ela mesma

1. **Não existe modelo de voz validado para idosos brasileiros.** Modelos
   treinados numa língua caem para perto do acaso em outra.
2. **O que a família precisa saber é se mudou**, não em que percentil ela está.
3. É a lógica do **HearO** (Cordio), o produto de voz com validação clínica
   mais madura: um modelo de voz específico para cada paciente. No estudo
   DETECT-HF (563 pacientes, 46 centros) previu mais de 70% dos eventos, em
   média 24,6 dias antes.

## 3. Onde entra a Agora

A Agora não é decorativa aqui: **sem voz em tempo real o produto não existe**,
porque a voz *é* o dado.

| Recurso da Agora | Para quê, no Prosa |
|---|---|
| **Conversational AI Engine** (SDK `agora-agents`) | cria e controla a Clara |
| **ASR Deepgram `nova-3`, `pt-BR`**, modo gerenciado | reconhece a fala sem chave de vendor |
| **TTS OpenAI**, modo gerenciado | voz da Clara, com `instructions` de tom calmo |
| **`turn_detection`** com `silence_duration_ms: 1000` | dá tempo de pensar a quem tem 78 anos (padrão do sample: 480ms) |
| **Interrupção** (`interrupt_duration_ms: 160`) | a pessoa fala em cima e a Clara para de falar |
| **RTM** (`enable_rtm` + `data_channel: "rtm"`) | transcrição por turno e estado do agente |
| **Custom LLM** (`llm.url` → nosso `/api/chat/completions`) | executa as brincadeiras via function calling |
| **Métricas** (`enable_metrics`) | latência por etapa do pipeline, exibida na interface |
| **Token RTC+RTM** (`buildTokenWithRtm`) | autenticação escopada por App ID + canal |

Detalhe de integração que vale citar: a requisição do Custom LLM **não traz o
canal**, então o join monta a `llm.url` com `?sid=<id da sessão>`. É isso que
amarra a chamada do LLM à conversa certa — e é o que permite abrir e fechar a
janela de cada brincadeira no momento exato.

## 4. Arquitetura

```
┌─ app/  (quickstart oficial agent-quickstart-nextjs, customizado) ──────────┐
│                                                                            │
│  TelaUmBotao ──► /api/generate-agora-token ──► token RTC+RTM               │
│       │                                                                    │
│       ├────────► POST /api/sessoes (serviço de análise) ──► sessao_id      │
│       │                                                                    │
│       └────────► /api/invite-agent ──► Agora ConvoAI                       │
│                      llm.url = .../api/chat/completions?sid=<sessao_id>    │
│                                                                            │
│  ConversationComponent                                                     │
│   ├─ RTC: áudio bidirecional com a Clara                                   │
│   ├─ RTM: transcrição por turno + estado do agente                         │
│   └─ useProsa ──► grava WAV (captura própria, sem ANS/AGC)                 │
│                                                                            │
│  /api/chat/completions  (Custom LLM)                                       │
│   ├─ function calling: as três brincadeiras                                │
│   └─ minuto dos bichos: resposta fixa, SEM chamar o LLM (latência ~0)      │
└────────────────────────────────┬───────────────────────────────────────────┘
                                 │ HTTP
┌─ analise/  (serviço Python separado) ─▼────────────────────────────────────┐
│  POST /api/sessoes/{id}/audio   ──► mede com Praat e APAGA o arquivo       │
│  POST /api/sessoes/{id}/falas   ──► medidas de texto                       │
│  POST /api/sessoes/{id}/brincadeira ──► janela que etiqueta as falas       │
│  POST /api/sessoes/{id}/finalizar   ──► linha de base ──► semáforo         │
│  GET  /painel?pessoa=<id>       ──► painel da família                      │
│  SQLite: só medidas e texto. Nunca áudio.                                  │
└────────────────────────────────────────────────────────────────────────────┘
```

**Por que dois processos** e não um: as medidas acústicas usam Praat
(`praat-parselmouth`), que é **GPLv3**. Mantendo-o como serviço separado, que
conversa por HTTP, o app Next.js não é um trabalho derivado dele. Ver
[Licenças](#12-licenças).

## 5. Como rodar

### Pré-requisitos

- Node.js 22+ e npm
- Python 3.10+ (testado em 3.14)
- [Agora CLI](https://github.com/AgoraIO/cli) — `irm https://dl.agora.io/cli/install.ps1 | iex` (Windows) ou `curl -fsSL https://dl.agora.io/cli/install.sh | sh`
- Conta na Agora com `rtc`, `rtm` e `convoai` habilitados

> **ffmpeg não é necessário.** O navegador grava WAV PCM direto, de propósito.

### 1. Serviço de análise

```bash
cd analise
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt     # Windows
# source .venv/bin/activate && pip install -r requirements.txt   # macOS/Linux

# painel de demonstração, com a persona simulada
python -m scripts.seed_simulado

# a pessoa real que vai conversar
python -m scripts.criar_pessoa "Dona Maria" 78

python -m uvicorn prosa_analise.app:app --port 8000
```

Painel da família: <http://127.0.0.1:8000/painel?pessoa=1>

### 2. App da conversa

```bash
cd app
npm install --package-lock=false      # ou: pnpm install

agora login                            # use o e-mail da inscrição no hackathon
agora project use <seu-projeto>
agora project feature enable rtc rtm convoai
agora quickstart env write .           # escreve .env.local

# acrescente no .env.local o id devolvido pelo criar_pessoa:
#   NEXT_PUBLIC_PROSA_PESSOA_ID=2

npm run dev                            # ou: pnpm dev
```

Abra <http://localhost:3000> e toque em **Conversar com a Clara**.

Use **fone de ouvido**: sem ele, a voz da Clara entra na gravação e é medida
como se fosse a pessoa.

### 3. Brincadeiras (opcional, precisa de túnel)

As brincadeiras rodam no Custom LLM, e a Agora precisa alcançá-lo por HTTPS:

```bash
cloudflared tunnel --url http://localhost:3000
# copie a URL https://... e no .env.local:
#   PROSA_LLM_URL=https://<sua-url>/api/chat/completions
#   PROSA_LLM_API_KEY=<um segredo longo qualquer>
#   PROSA_OPENAI_API_KEY=<sua chave OpenAI>
```

Sem isso a Clara conversa normalmente, mas as medidas de texto ficam vazias.

### Verificação

```bash
cd analise && .venv/Scripts/python -m pytest -q      # 13 testes
cd analise && .venv/Scripts/python -m scripts.validar
cd app && npm run lint && npm run build
agora project doctor
```

## 6. Dependências

**App** (`app/package.json`): `agora-agents`, `agora-rtc-sdk-ng`,
`agora-rtc-react`, `agora-rtm`, `agora-agent-client-toolkit`,
`agora-agent-uikit`, `agora-token`, `next` 16, `react` 19, `ai` (AI SDK 6),
`@ai-sdk/openai`, `tailwindcss`.

**Análise** (`analise/requirements.txt`): `fastapi`, `uvicorn`, `pydantic`,
`praat-parselmouth`, `numpy`, `python-multipart`, `pytest`, `httpx`.

## 7. Preexistente × feito no hackathon

### Preexistente — não é nosso

| O quê | Origem | Licença |
|---|---|---|
| Todo o `app/`, como base | [`AgoraIO-Conversational-AI/agent-quickstart-nextjs`](https://github.com/AgoraIO-Conversational-AI/agent-quickstart-nextjs), clonado com `agora quickstart create` | MIT |
| SDKs e toolkits da Agora | pacotes npm | ver cada pacote |
| Praat, via `praat-parselmouth` | upstream | GPLv3 |
| `.agents/skills/agora` | `npx skills add AgoraIO/skills` | MIT |

Os arquivos do quickstart que **modificamos** estão preservados, intactos, em
[`original-quickstart/`](original-quickstart/) — basta comparar para ver
exatamente o que mudamos.

**Sobre a pasta `prosa/`:** é o quickstart **Python** oficial
(`agent-quickstart-python`), que clonamos primeiro e depois abandonamos. Os
scripts dele usam caminhos POSIX de venv (`source venv/bin/activate`), e no
Windows o venv cria `venv/Scripts/` — então `bun run setup` não roda. Trocamos
para o baseline Next.js, que é nativo em Node. Deixamos a pasta no repositório
por transparência do caminho percorrido; **ela não faz parte da solução** e
nada em `app/` ou `analise/` depende dela.

### Feito no hackathon — é nosso

**Arquivos novos:**

| Arquivo | O que é |
|---|---|
| `app/lib/clara.ts` | persona da Clara, prompt pt-BR, regras das brincadeiras |
| `app/lib/brincadeiras.ts` | as brincadeiras como tools + caminho rápido sem LLM |
| `app/lib/prosa-chat-completions.ts` | Custom LLM com function calling e autenticação |
| `app/lib/gravador.ts` | gravador WAV no navegador, sem ANS/AGC |
| `app/lib/prosa-api.ts` | cliente do serviço de análise |
| `app/hooks/use-prosa.ts` | liga a conversa às medidas |
| `app/components/TelaUmBotao.tsx` | tela acessível, um botão só |
| `app/public/prosa-worklet.js` | AudioWorklet que extrai o PCM |
| `analise/` (inteiro) | serviço de análise, painel, seed, validação, testes |

**Arquivos do quickstart que alteramos:**

| Arquivo | O que mudamos |
|---|---|
| `app/api/invite-agent/route.ts` | persona Ada → Clara; ASR `en` → `pt-BR`; TTS MiniMax → OpenAI; `silence_duration_ms` 480 → 1000; caminho de Custom LLM com `?sid=` |
| `app/api/chat/completions/route.ts` | passou a usar o nosso handler com as brincadeiras |
| `components/LandingPage.tsx` | abre a sessão do Prosa antes do join; usa a tela de um botão |
| `components/ConversationComponent.tsx` | chama `useProsa`; encerra a sessão antes de desligar |
| `types/conversation.ts` | campo `prosa_sessao_id` |
| `env.local.example` | variáveis do Prosa |

Arquitetura, fluxo de token, nomes de env, ciclo de vida e comandos
documentados do quickstart: **preservados**.

## 8. Dados simulados

O painel de demonstração usa **"Dona Cida, 78 anos" — uma pessoa que não
existe.** As medidas dela foram geradas por `analise/scripts/seed_simulado.py`.
**Nenhuma pessoa real foi gravada para produzir aqueles números.**

Isso está marcado em três lugares: a coluna `simulado` no banco, o selo
**⚠️ DADOS SIMULADOS** no topo do painel, e o nome dela ("Dona Cida
(SIMULADA)").

**Por que simular:** o Prosa detecta mudança ao longo de semanas. Um hackathon
de dois dias não produz esse histórico. Em vez de fingir que produziu, geramos
um histórico declaradamente sintético.

**O que é simulado:** as medidas.
**O que não é simulado:** a regra de decisão. O status de cada dia sai do mesmo
código que roda numa conversa real.

Progressão do seed — 10 dias estáveis e 4 com deriva:

```
dias  1–5   ⚪ calibrando     formando a linha de base
dias  6–10  🟢 verde          nenhum falso alarme
dia  11     🟡 amarelo        duração das pausas +21%, tempo em pausas +28%, respostas −19%
dias 12–14  🔴 vermelho       a mudança se manteve
```

## 9. Validação

### O que medimos

**1. Falso alarme** (`scripts/validar.py`) — 3.000 conversas de uma pessoa
totalmente estável, passando pela mesma regra de decisão de produção.
Qualquer alerta aqui é falso positivo por definição.

| | |
|---|---|
| Falsos amarelos | **9 em 3.000** |
| Taxa por conversa | **0,30%** |
| Na prática | 1 falso alarme a cada ~333 conversas (~11 meses no uso diário) |

**2. Sensibilidade** — com que frequência o semáforo acende, por intensidade
de deriva:

| Intensidade da deriva | Detecção |
|---:|---:|
| 0,25 | 4,0% |
| 0,50 | 26,4% |
| 0,75 | 76,6% |
| 1,00 (cenário do seed) | **97,1%** |
| 1,25 | 99,9% |

Lido honestamente: deriva leve passa batido. O Prosa pega mudança consistente,
não sutileza.

**3. Teste-reteste (ICC)** — `scripts/validar.py` calcula ICC(1) por medida
sobre as gravações reais que estiverem no banco. Precisa de pelo menos 2
pessoas com 2 conversas cada.

### Um achado que mudou o produto

A regra inicial do nosso projeto era **2 medidas × 2,0 desvios**, com linha de
base a partir de 3 conversas. Rodando o seed, ela acendeu **falso amarelo em 2
dos 10 dias estáveis**. Duas causas reais:

1. Desvio-padrão estimado com 3 pontos é ruidoso e enviesado para baixo.
2. Testando 10 medidas e exigindo só 2, o acaso basta (~2% por conversa).

Apertamos para **5 conversas de base × 2,5 desvios × 3 medidas**. O falso
alarme caiu para 0,30% e a detecção da deriva se manteve em 97%.

**Ressalva que não escondemos:** as 10 medidas **não** são independentes entre
si — "tempo em pausas" e "duração das pausas" andam juntas. Como a simulação
assume ruído independente, o falso alarme real deve ser **maior** que 0,30%.

## 10. LGPD e ética

Dado de saúde e dado **biométrico** ligados a uma pessoa são dados pessoais
**sensíveis** (LGPD, art. 5º, II) e exigem **consentimento específico e
destacado** do titular ou do responsável legal (art. 11).

| Medida | Onde está no código |
|---|---|
| **O áudio é apagado logo após a análise** — nunca é persistido | `analise/prosa_analise/app.py`, bloco `finally` do endpoint de áudio |
| Áudio não é coluna de nenhuma tabela | `analise/prosa_analise/db.py` |
| Guardamos só medidas numéricas e texto | idem |
| A família vê tendências, nunca gravações — não existe endpoint de áudio | `app.py` |
| Consentimento em linguagem simples, **antes** de gravar | `app/components/TelaUmBotao.tsx` |
| Data do consentimento registrada | coluna `consentimento_em` |
| Nenhuma credencial ou dado pessoal no repositório | `.gitignore` |

Verificado por teste: `test_audio_e_apagado_depois_da_analise`.

### Decisões éticas

- **A pessoa idosa sabe** que a conversa acompanha o bem-estar dela. Nada de
  vigilância escondida.
- **O semáforo não é mostrado para ela.** Exibir um alerta de saúde para a
  pessoa seria assustador e não é o produto. Quem vê tendência é a família.
- **Falso positivo gera ansiedade; falso negativo gera falsa segurança.** Por
  isso o vermelho exige mudança **persistente**, e a mensagem sempre orienta
  procurar um profissional em vez de afirmar algo.
- **Emergência:** diante de dor no peito, falta de ar, queda, confusão súbita
  ou fala de autolesão, a Clara orienta ligar para o **SAMU 192** ou chamar um
  familiar.
- **Posicionamento regulatório:** bem-estar e companhia, **não** diagnóstico.
  A RDC nº 657/2022 da Anvisa regula software como dispositivo médico e **não
  se aplica a software de bem-estar**. Se um dia o Prosa virar diagnóstico,
  passa a seguir o rito da Anvisa.
- **Clonagem de voz e avatar dos participantes:** não usamos. O regulamento do
  hackathon não autoriza (item 11).

## 11. Limitações

Diremos isto no pitch, não vamos esconder:

- **Nenhuma validação clínica.** Nem em idosos, nem em português. O que
  validamos é a regra de decisão, não capacidade de detectar doença.
- **Evidência do campo ainda é frágil.** Dos 96 estudos da meta-análise, 83
  são transversais e 50 têm menos de 100 participantes, a maioria com alto
  risco de viés na seleção de pacientes.
- **Medida depende do microfone e do ambiente.** Diferenças de microfone, taxa
  de amostragem e sala podem dominar o que o modelo aprende.
- **Fatores de confusão:** resfriado, cansaço, humor, dentadura.
- **Deriva leve passa batido** (26% de detecção a metade da intensidade).
- **Contagem de bichos usa léxico fixo.** Bicho fora da lista não é contado.
  Preferimos subcontar a inflar com palavra que não é animal.
- **Supressão de ruído e ganho automático alteram jitter e shimmer.** Por isso
  gravamos em captura própria com ANS e AGC desligados — mas o cancelamento de
  eco fica ligado, e ele também mexe no sinal.
- **A janela de brincadeira guarda o cronômetro na memória do processo.** Com
  mais de uma instância do Next, o cronômetro se perde (a janela em si está no
  banco). Em produção isso vira Redis.
- **Amostra real do nosso teste:** o próprio time — pessoas jovens, poucos
  dias. Não representa a população-alvo.

## 12. Licenças

| Componente | Licença | Consequência |
|---|---|---|
| `app/` (base do quickstart) | MIT | sem restrição |
| SDKs da Agora | ver pacotes | sem restrição para uso |
| **`praat-parselmouth`** | **GPLv3** | **copyleft** — ver abaixo |
| Código nosso | a definir pelo time | — |

**Sobre o GPLv3 do Praat:** é copyleft, então código linkado a ele precisa ser
GPL também. Por isso as medidas acústicas vivem num **processo separado**
(`analise/`), que conversa com o app por HTTP. Essa é a mitigação usual para
manter o resto do código sob outra licença, mas **vale confirmar com um
advogado antes de licenciar comercialmente**.

**Avaliamos e descartamos o openSMILE.** Ele tem licença dupla e a versão
aberta proíbe uso em produto comercial — exigiria licença paga da audEERING,
o que mataria o modelo B2B com operadoras de saúde.

## 13. Roadmap

**O próximo passo de produto é tirar a tela da frente.** Boa parte dos 32
milhões de idosos não tem smartphone nem paciência para app. O destino é a
Clara **ligar no telefone da pessoa**:

```
Telefone da pessoa ──PSTN──► CPaaS com número BR
                                 │ áudio bidirecional (WebSocket)
                                 ▼
                            bridge no servidor
                                 │ Agora Server Gateway
                                 ▼
                          canal RTC ──► Clara (ConvoAI)
```

Hoje a entrega é a tela de um botão. A ligação telefônica é trabalho de
semanas, não de 20 horas — e dizer isso é parte de ser honesto sobre o estágio.

Outros passos, em ordem de prioridade:

1. **Piloto com parceiro clínico**, coorte de idosos brasileiros, desfecho
   acompanhado. É o único caminho para validação de verdade.
2. **Timestamp por palavra** (o ASR já entrega o texto; falta o tempo) para
   medir pausa entre palavras e latência de resposta com precisão.
3. **Ligação agendada**, no horário combinado com a família.
4. **Notificação ativa** para a família quando o semáforo mudar.
5. **Lembrete de remédio** dentro da conversa.
6. **Memória entre sessões**, para a Clara retomar o assunto de ontem.

---

## Fontes

**Agora**
- Docs: <https://docs.agora.io/en/ai>
- Quickstart usado como base: <https://github.com/AgoraIO-Conversational-AI/agent-quickstart-nextjs>
- Skills: <https://github.com/AgoraIO/skills>

**Ciência**
- NIH Bridge2AI — Voice as a Biomarker of Health: <https://physionet.org/content/b2ai-voice/4.0.0/>
- Meta-análise, BMJ Evidence-Based Medicine 2025: <https://www.epistemonikos.org/en/documents/084beaf4f9ab862ecddfd7ef83e47107d03cc5a8>
- Framingham (MCI/demência): <https://www.osti.gov/pages/servlets/purl/1976265>
- Universidade de Miami (pausas no MCI): <https://news.med.miami.edu/post-pause-speech-patterns-detect-mild-cognitive-impairment/>
- Cordio DETECT-HF: <https://cardiovascularbusiness.com/topics/clinical/heart-failure/voice-changes-may-detect-worsening-heart-failure-weeks-other-symptoms-appear>
- SPIRA / IME-USP: <https://agencia.fapesp.br/50844>
- De Jong & Wempe (2009), núcleos silábicos — base do nosso contador de sílabas

**Brasil, regulação e saúde pública**
- IBGE, Censo 2022 (60+): <https://agenciadenoticias.ibge.gov.br/agencia-noticias/2012-agencia-denoticias/noticias/38186->
- Anvisa, RDC 657/2022 (perguntas e respostas): <https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2022/software-como-dispositivo-medico-perguntas-e-respostas>
- LGPD (Lei 13.709/2018): <https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm>
- OMS, conexão social: <https://who.int/news/item/30-06-2025-social-connection-linked-to-improved-heath-and-reduced-risk-of-early-death>
