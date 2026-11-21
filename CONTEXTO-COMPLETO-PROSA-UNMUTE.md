# PROSA × UNMUTE by Agora — Contexto completo do projeto

> Documento-mestre da equipe. Reúne regras do hackathon, entregáveis, critérios, a ideia, a pesquisa científica e regulatória, a arquitetura técnica com a Agora, o código já escrito, o roadmap, o pitch e os riscos.
> Atualizado em **sáb 21/11/2026, 14h** (horário de Brasília).

---

## Sumário

1. [O hackathon](#1-o-hackathon)
2. [Regras e regulamento](#2-regras-e-regulamento-resumo-fiel)
3. [Entregáveis obrigatórios](#3-entregáveis-obrigatórios)
4. [Critérios de avaliação](#4-critérios-de-avaliação)
5. [Agenda](#5-agenda)
6. [A ideia: Prosa](#6-a-ideia-prosa)
7. [O que a ciência diz](#7-o-que-a-ciência-diz-pesquisa-em-fontes-oficiais)
8. [Regulação, LGPD e ética](#8-regulação-lgpd-e-ética)
9. [Pontos positivos e negativos](#9-pontos-positivos-e-negativos)
10. [A Agora: o que é e o que vamos usar](#10-a-agora-o-que-é-e-o-que-vamos-usar)
11. [Arquitetura técnica](#11-arquitetura-técnica)
12. [Código já escrito (prosa.zip)](#12-código-já-escrito-prosazip)
13. [Dados: reais, simulados e validação](#13-dados-reais-simulados-e-validação)
14. [Roadmap até a entrega](#14-roadmap-até-a-entrega)
15. [Divisão do time](#15-divisão-do-time)
16. [Pitch, slides e demo](#16-pitch-slides-e-demo)
17. [Perguntas prováveis da banca](#17-perguntas-prováveis-da-banca)
18. [Riscos e planos B](#18-riscos-e-planos-b)
19. [Checklists](#19-checklists)
20. [Fontes](#20-fontes)

---

## 1. O hackathon

| Item | Detalhe |
|---|---|
| Nome | **UNMUTE · by Agora** — hackathon presencial de Voice AI |
| Organização | NewHack, com a participação da Agora |
| Data | **21 e 22 de novembro de 2026** (presença obrigatória nos dois dias) |
| Local | AI House Brasil, Av. Brigadeiro Luiz Antônio, 4917, São Paulo/SP |
| Vagas | 60 participantes; inscrição gratuita e sujeita a aprovação |
| Tema | "Dê voz ao que ainda não existe." Escolher um problema real e construir uma experiência que **ouça, entenda e ajude** |
| Trilhas | **Agentes** (conversas que resolvem problemas), **Avatares** (presença e interação com IA), **Physical Voice AI** (dispositivos e robôs; hardware opcional, simulação permitida, nenhum hardware fornecido) |
| Contato | terron@newhack.vc |

**Pessoas da abertura**
- NewHack: Rodrigo Terron (sócio fundador), Giselle Cruz (sócia e head de operações), Brunno Matias (head de marketing e comunicações)
- Agora: Tony Wang (cofundador e CRO) e **Yan Belot** (Voice AI & Real-Time Agents, GTM Brasil). O Yan é o contato técnico a procurar.
- Estrella Ouyang (fundadora da feita.ai)

**Premiação (valor por equipe, não por pessoa)**

| Colocação | Prêmio |
|---|---|
| 🥇 1º | US$ 2.000 |
| 🥈 2º | US$ 1.000 |
| 🥉 3º | US$ 500 |

Os três primeiros também apresentam o pitch no **Executive Dinner da Agora**, para executivos do mercado financeiro, e ganham créditos da Agora e benefícios de parceiros.

---

## 2. Regras e regulamento (resumo fiel)

**Equipes**
- De 3 a 5 integrantes, todos inscritos, aprovados e com presença confirmada nos dois dias. Não pode individual nem dupla.

**Tecnologia**
- O **uso funcional da Agora é obrigatório** e precisa ser demonstrado. Só citar a marca não atende.
- Criar a conta da Agora com o **mesmo e-mail da inscrição**, para receber os créditos do evento.
- Cadastrar a equipe e a submissão no **OS do Hackathon**.

**Código e segurança (item 5.5)**
- O repositório precisa ser **público na entrega** e continuar acessível durante a avaliação.
- Identificar **o que já existia** e **o que foi feito no hackathon**.
- Respeitar licenças.
- **Não publicar** credenciais, dados pessoais, material confidencial ou ativos de terceiros.
- **Simulações precisam estar identificadas.** Hardware não é obrigatório.

**Propriedade intelectual (item 9)**
- O projeto continua sendo dos autores. Nada é transferido à organização, à Agora, à NewHack ou aos patrocinadores.
- O time define entre si a titularidade das contribuições.

**Divulgação (item 10)**
- Só com autorização expressa. Precisa refletir resultados efetivamente demonstrados, sem promessas não comprovadas.

**Imagem e voz (item 11)**
- O uso de imagem e voz dos participantes depende de autorização específica.
- Clonagem de voz e criação de avatar dos participantes **não** estão autorizadas.

**Decisões**
- A comissão organizadora interpreta o regulamento. As decisões técnicas e de avaliação são finais.

**Desempate**, nesta ordem: maior média em experiência de voz e interação → execução técnica e integração com a Agora → relevância e impacto → decisão fundamentada da banca.

---

## 3. Entregáveis obrigatórios

Cadastrar tudo no OS **até 12h de domingo, 22/11** (meta interna: **11h30**).

| # | Entregável | Especificação |
|---|---|---|
| a | **Descrição** | Problema, público-alvo, solução e uso da tecnologia da Agora |
| b | **Apresentação** | Até **10 slides**, em PDF, PPT/PPTX ou link do Canva |
| c | **Vídeo demo** | Narrado, **até 2 min**, com uma **interação real** com o protótipo e a integração com a Agora. Arquivo ou link acessível à banca (pode ser não listado) |
| d | **Repositório público** | GitHub ou equivalente, com código, **README com instruções de execução, dependências e identificação da versão entregue** |

- O link do protótipo é complementar e **não substitui** o repositório.
- **Não** são exigidos vídeo pitch separado, manual, press release nem FAQ.

**Apresentação à banca:** 3 min de pitch + 2 min de demo (ao vivo ou com o vídeo entregue) + até 3 min de perguntas. O vídeo serve de **plano B** se a conexão falhar.

---

## 4. Critérios de avaliação

Notas de 1 a 5 em cada critério. A nota do jurado é Σ(nota × peso) / 100, e a final é a média dos jurados.

| Peso | Critério | O que a banca olha | Como o Prosa pontua |
|---:|---|---|---|
| **25%** | Experiência de voz e interação | Clareza, fluidez, tempo de resposta, interrupções, recuperação de falhas | Voz calma em pt-BR, turnos ajustados para idoso, interrupção ligada, frases curtas, mensagem de falha amigável |
| **25%** | Execução técnica e integração com a Agora | Fluxo funcionando, integração efetiva, consistência | ConvoAI + Custom LLM + function calling + RTM + Update API + medidas sobre o áudio da conversa |
| **20%** | Relevância do problema e impacto | Público, problema concreto, benefício | 32 milhões de idosos, solidão, detecção precoce de mudanças |
| **15%** | Inovação e diferenciação | A voz melhora a experiência? | Aqui a voz **é** o dado: sem voz o produto não existe |
| **10%** | Validação e potencial de evolução | Testes, aprendizados, limitações, próximos passos | Teste-reteste com o time, sessão alterada, limitações honestas, piloto clínico |
| **5%** | Clareza da apresentação | Explicação e demonstração no tempo | Roteiro cronometrado e ensaiado |

---

## 5. Agenda

**Sábado 21/11**

| Horário | Atividade |
|---|---|
| 09:00 | Credenciamento e welcome coffee |
| 09:30 | Abertura e instruções |
| 10:30 | Brainstorm das equipes |
| 12:30 | Almoço |
| 13:30–23:50 | Building time e mentoria |
| 16:30 | Café da tarde |
| 22:30 | Pizza |

**Madrugada e domingo 22/11**

| Horário | Atividade |
|---|---|
| 00:00–06:00 | Building noturno opcional (a casa fica aberta) |
| 08:00 | Café da manhã |
| 08:00–12:00 | Finalização e mentoria |
| **12:00** | **Prazo final de submissão no OS** |
| 12:00–13:00 | Almoço |
| **13:00** | **Pitches** |
| 17:00 | Premiação, happy hour e encerramento |

---

## 6. A ideia: Prosa

### Origem
A ideia inicial do time era uma IA que conversa diariamente com a pessoa idosa e, **só pela voz**, identifica uma possível doença: uma pré-análise que permitiria agir antes.

### Reenquadramento (decisão importante)
A pesquisa mostrou que a voz serve para **triagem e monitoramento de mudanças**, não para **diagnóstico**. O projeto passou a ser:

> **Prosa — companhia por voz que percebe quando algo mudou.**
> *"Não diagnostica. Escuta todo dia e avisa a família quando algo mudou."*

- **Produto:** Prosa
- **Agente:** Gabriel, voz calorosa em português do Brasil
- **Persona de demo:** "Dona Cida, 78 anos", com **dados simulados e identificados**

### Como funciona
1. A pessoa idosa conversa com o Gabriel todos os dias (bate-papo, memórias, família).
2. Dentro da conversa entram **brincadeiras** (nunca chamadas de "teste"):
   - **Memória:** guardar 3 palavras no começo e lembrar no fim
   - **Fluência verbal:** falar o máximo de bichos em 1 minuto
   - **Orientação:** "que dia da semana é hoje?"
3. O sistema mede sinais da **voz** (velocidade, pausas, entonação, qualidade vocal) e do **texto** (tamanho das respostas, variedade de vocabulário).
4. Cada medida é comparada com a **linha de base da própria pessoa** (as primeiras conversas).
5. Semáforo: 🟢 normal · 🟡 mudança percebida · 🔴 mudança persistente (recomenda procurar um profissional).
6. O **painel da família** mostra tendências e alertas, nunca gravações.
7. O Gabriel adapta a conversa ao contexto. Exemplo: se a última conversa foi amarela, pergunta com carinho como a pessoa dormiu.

### Por que comparar a pessoa com ela mesma
- Não existe modelo de voz validado para idosos brasileiros.
- Modelos de voz treinados numa língua generalizam mal para outra.
- O que a família precisa saber é **se mudou**.
- O HearO, produto validado clinicamente, usa exatamente essa lógica: um **modelo de voz específico para cada paciente**.

### Público e modelo de negócio
- **Usuários:** idosos que moram sozinhos ou passam muito tempo sem companhia.
- **Quem paga:** famílias (assinatura), residenciais e instituições de longa permanência, planos de saúde e operadoras (que querem evitar internação), programas de atenção primária.
- **Valor duplo:** a companhia, contra a solidão, e o acompanhamento, com detecção precoce de mudança.

---

## 7. O que a ciência diz (pesquisa em fontes oficiais)

### 7.1 O campo existe e é financiado
- **NIH Bridge2AI — Voice as a Biomarker of Health**
  - Projeto de **US$ 14 milhões** em quatro anos, liderado pela University of South Florida e pela Weill Cornell, com 12 instituições.
  - Está montando um banco ético de **10.000 vozes** de pacientes com várias doenças para treinar IA de apoio ao diagnóstico.
  - Doenças estudadas: doenças respiratórias, depressão, Alzheimer, Parkinson, autismo, câncer e distúrbios de voz.
  - Os dados estão no PhysioNet (Bridge2AI-Voice v4.0.0).

### 7.2 Meta-análise (BMJ Evidence-Based Medicine, 2025)
96 estudos, cobrindo 20 doenças:

| Grupo | Estudos | Sensibilidade | Especificidade |
|---|---|---|---|
| Psiquiátricas | 11 (n = 2.577) | 0,80 | 0,77 |
| **Cognitivas** | 27 (n = 2.068) | **0,85** | **0,83** |
| Motoras (Parkinson) | 20 (n = 852) | 0,81 | 0,83 |

- **Ressalvas:**
  - Dos 96 estudos, 83 são transversais e 50 têm menos de 100 participantes.
  - A maioria tem **alto risco de viés** na seleção de pacientes.
  - Os autores pedem estudos prospectivos grandes.
- **Conclusão dos autores:** a voz é promissora para **triagem e monitoramento**, inclusive pelo celular. O desempenho depende do aparelho, do ambiente, da língua, da tarefa de fala e do algoritmo.

### 7.3 Por doença

**Declínio cognitivo e Alzheimer**
- **Framingham (Boston University):**
  - AUC de **92,6%** para separar normal de demência.
  - **74,4%** nas distinções mais difíceis, envolvendo comprometimento cognitivo leve.
- **Universidade de Miami:** quem tem comprometimento cognitivo leve demora mais para retomar a fala depois de pausas e usa palavras mais comuns.
- **UT Southwestern (206 pessoas):** a fala detectou comprometimento cognitivo e foi comparada com líquor e ressonância magnética.
- **Columbia Nursing:** desenvolve, com verba do NIH, triagem por voz para comprometimento cognitivo leve e demência inicial em pacientes de home care.

**Parkinson**
- Muitos estudos têm acurácia alta, mas com amostras **pequenas**, quase sempre com menos de 60 pacientes.
- Com gravação real de celular (base mPower), um modelo caiu para **AUC 0,6–0,7**.

**Insuficiência cardíaca (o caso mais maduro e mais parecido com o Prosa)**
- **Cordio HearO, estudo DETECT-HF:**
  - 563 pacientes, cego, multicêntrico (46 centros).
  - Previu **mais de 70% dos eventos**, em média **24,6 dias antes**.
  - Usa **6 frases faladas por dia** no celular e um **modelo de voz específico de cada paciente**.
  - Adesão de **85%**.
  - Apresentado na AHA 2026 e publicado no JACC: Heart Failure.
  - Recebeu a designação **Breakthrough Device do FDA em 2021**.

**Depressão**
- A Kintsugi desenvolveu um modelo de depressão e ansiedade pela voz.
- **Encerrou as operações comerciais** depois de anos tentando liberação De Novo no FDA e **abriu o código**, que está no Hugging Face.

**Respiratório (pesquisa brasileira)**
- **SPIRA / SPIRA-BM (IME-USP, FAPESP):**
  - Detecta **insuficiência respiratória pela fala**, com acurácia próxima de 100% em cenários de pesquisa.
  - Os dados vêm de pacientes de COVID no HC-FMUSP e no HU-USP.
  - Concluiu que a voz **não** permite estimar a saturação de oxigênio. Serve para **triagem**, não substitui o oxímetro.
  - Medidas usadas: pausas, entonação, F0, jitter, shimmer e relação harmônico-ruído.

### 7.4 Limitações reconhecidas na literatura
- **Língua:** modelos de esquizofrenia e de autismo treinados numa língua caíram para perto do acaso em outra.
- **Microfone e ambiente:** diferenças de microfone, taxa de amostragem e sala podem dominar o que o modelo aprende.
- **Fatores de confusão:** resfriado, estado emocional, distância do microfone e postura.
- O desempenho ainda está aquém do exigido para uso clínico. São necessárias tendência ao longo do tempo e protocolos padronizados.

### 7.5 Contexto demográfico e social
- **Censo 2022 (IBGE):**
  - **32.113.490 pessoas com 60 anos ou mais (15,6%)**, alta de 56% desde 2010.
  - Índice de envelhecimento de 80, ou seja, 80 idosos para cada 100 crianças.
  - Mulheres são 55% dos idosos (dado do governo do Paraná sobre o Censo).
- **OMS:**
  - Isolamento social e solidão aumentam o **risco de mortalidade em 14–32%** e o risco de AVC, doenças cardiovasculares, **depressão e demência**.
  - Cerca de **11,8% dos idosos** sentem solidão.
  - A solidão está ligada a cerca de **871 mil mortes por ano**.

---

## 8. Regulação, LGPD e ética

### Anvisa: software como dispositivo médico
- A **RDC nº 657/2022**, em vigor desde 1º/07/2022, regula software como dispositivo médico (SaMD). Também se aplica a RDC 751/2022.
- **Não se aplica a software de bem-estar.**
- Um software com **finalidade diagnóstica** precisa de regularização.
- A Anvisa está revisando a RDC 657 para incluir mecanismos específicos para IA.
- **Decisão do Prosa:** posicionar como **bem-estar, companhia e alerta de mudança**, nunca diagnóstico. Se no futuro virar diagnóstico, passa a seguir o rito da Anvisa.

### FDA (referência internacional)
- O HearO recebeu a designação Breakthrough em 2021.
- A Kintsugi encerrou as operações comerciais sem conseguir a liberação De Novo.
- Lição: diagnóstico regulado é caro e lento. Começar por monitoramento é o caminho realista.

### LGPD
- **Art. 5º, II:** dado de saúde e dado **biométrico** ligados a uma pessoa são **dados pessoais sensíveis**.
- **Art. 11:** o tratamento exige **consentimento específico e destacado** do titular ou do **responsável legal**, ou outra base do próprio artigo.
- **Medidas no Prosa:**
  - Consentimento explícito do idoso.
  - O áudio é **apagado logo após a análise**.
  - Guardamos só medidas numéricas e texto.
  - A família vê tendências, nunca gravações.
  - Nenhum dado pessoal vai para o repositório.

### Ética
- O idoso **sabe** que a conversa ajuda a acompanhar o bem-estar dele. Nada de vigilância escondida.
- Falso positivo gera ansiedade e falso negativo gera falsa segurança. Por isso o alerta exige mudança **persistente** e a mensagem sempre orienta procurar um profissional.
- Em sinais de emergência (dor no peito, falta de ar, queda, confusão súbita, fala de se machucar), o Gabriel orienta ligar para o **SAMU 192** ou para um familiar.
- **Whisper:** o próprio model card desaconselha usá-lo para classificar atributos humanos ou em decisões de alto risco. No Prosa, ele só entraria em transcrição com marcação de tempo por palavra.

---

## 9. Pontos positivos e negativos

### ✅ Positivos
- **Problema grande e crescente:** 32,1 milhões de idosos.
- **Duas dores com um produto:** detecção precoce e solidão. A companhia já gera valor mesmo sem a parte de saúde.
- **Respaldo científico real:** NIH, meta-análise, Cordio e SPIRA.
- **Inovação legítima:** a voz é o próprio dado, o que responde ao critério "a voz melhora a experiência?".
- **Acessível ao idoso:** só conversar, sem tela complexa nem digitação.
- **Alinhado com a Agora:** ela mesma publica receitas de biomarcadores de voz (Thymia e Wellness Coach).
- **Integração profunda com a Agora**, não decorativa.
- **Sinal barato e diário:** só precisa de celular ou computador.
- **Potencial de negócio:** saúde suplementar, residenciais e famílias. Bom para o Executive Dinner.

### ❌ Negativos e riscos
- **Evidência ainda frágil:** amostras pequenas e risco de viés.
- **Português:** nenhum modelo validado. Não dá para validar clinicamente em 24h.
- **Microfone e ambiente** distorcem as medidas.
- **Fatores de confusão:** resfriado, cansaço, humor, dentadura.
- **Regulação:** se prometer diagnóstico, entra na Anvisa.
- **LGPD pesada,** e o consentimento de idoso pode envolver o responsável legal.
- **Ética:** risco de parecer vigilância.
- **Tempo:** 23h para agente, servidor, áudio, painel, vídeo e slides.
- **ASR nativo (ARES) sem pt-BR,** o que cria dependência do Deepgram.
- **Supressão de ruído e cancelamento de eco** podem alterar jitter e shimmer. Precisa testar.
- **Demo difícil:** a mudança ao longo de dias não aparece em 2 dias, então exige dados simulados identificados.
- **Pitch:** promessa grande demais destrói a credibilidade.

### Como transformar negativos em força
| Risco | Resposta |
|---|---|
| Sem validação em pt-BR | Linha de base individual, comparando a pessoa com ela mesma |
| Regulação | Bem-estar e alerta, não diagnóstico |
| Falso positivo | Alerta só com mudança persistente em várias medidas e sessões |
| Ética | Consentimento explícito; família vê tendências, não gravações |
| Validação | Teste-reteste com o time e limitações declaradas |

---

## 10. A Agora: o que é e o que vamos usar

A Agora (agora.io) é uma plataforma de comunicação em tempo real (voz e vídeo) com o **Conversational AI Engine** para agentes de voz.

### Camadas de um Voice Agent
1. **Transporte em tempo real (RTC):** áudio e eventos com baixa latência
2. **Runtime do agente:** turnos de fala, interrupções, memória e ferramentas
3. **Modelos:** ASR → LLM → TTS
4. **Ponto de entrega:** app, Agent Studio ou dispositivo

### Recursos usados no Prosa
| Recurso | Para quê |
|---|---|
| **Conversational AI Engine** (REST `join` / `update` / `leave`) | Criar e controlar o Gabriel |
| **ASR Deepgram `nova-3`, `pt-BR`, `credential_mode: managed`** | Reconhecer a fala sem chave própria. O ARES lista pt-PT, não pt-BR |
| **Custom LLM** (`llm.url` apontando para o nosso servidor) | Persona, brincadeiras e registro das falas |
| **Function calling** | Executar as brincadeiras no nosso servidor |
| **turn_detection** (`silence_duration_ms` = 1000; o exemplo da doc usa 640) | Dar tempo ao idoso de pensar |
| **Interrupção** | Idoso interrompe e o Gabriel para |
| **RTM** (`enable_rtm: true`, `data_channel: "rtm"`) | Eventos `state.listening`, `state.thinking` e `state.speaking` com timestamp, mais legendas |
| **Update API** (`llm.system_messages`) | Injetar contexto no meio da conversa |
| **TTS OpenAI** (`gpt-4o-mini-tts`, voz `coral`, com `instructions` de tom calmo em pt-BR) | Voz do Gabriel (BYOK) |
| Cloud Recording (opcional) | Gravar a conversa. Se usar, configurar `audio_scenario: "chorus"` |

### Detalhes da API
- **Join:** `POST https://api.agora.io/api/conversational-ai-agent/v2/projects/{appid}/join`
  - Autenticação: **Basic** (Customer ID : Customer Secret)
  - Corpo: `name` + `properties` (`channel`, `token`, `agent_rtc_uid`, `remote_rtc_uids`, `asr`, `llm`, `tts`, `turn_detection`, `parameters`)
- **Update:** `POST .../agents/{agentId}/update`, com `properties.llm.system_messages`
- **Custom LLM:**
  - A Agora envia um POST no formato OpenAI Chat Completions, com `stream=true` obrigatório (o exemplo oficial responde 400 se `stream=false`).
  - Precisamos responder em **SSE**: linhas `data: {chunk}`, terminando com `data: [DONE]`.
  - A requisição **não traz o canal**, então identificamos a sessão com `?sid=` na `llm.url`.
- **Modo gerenciado:** ASR ARES e Deepgram (nova-2 e nova-3), LLM OpenAI (gpt-4o-mini, gpt-4.1-mini, gpt-5-nano, gpt-5-mini), TTS Cartesia, Fish Audio, MiniMax e OpenAI tts-1.

### Starter oficial (CLI)
```bash
curl -fsSL https://dl.agora.io/cli/install.sh | sh
agora login
agora init prosa-cliente --template python   # FastAPI + Next.js
bun run setup && bun run dev                 # abre http://localhost:3000
agora project doctor                         # diagnóstico de credenciais e rede
```

### Receitas oficiais relevantes (recipes.agora.io)
- **Thymia Biomarkers e Wellness Coach:**
  - São o **modelo de arquitetura do Prosa**.
  - Um `go-audio-subscriber` (SDK nativo) captura o áudio do canal RTC e manda PCM para análise.
  - Os scores voltam ao LLM pela **Update API** e ao cliente pela **RTM**.
  - A chave da Thymia é paga e sob pedido. **Perguntar ao Yan se há chave no evento.**
- **Outras receitas úteis:** Custom LLM, Cross-Session Memory, Filler Words & Graceful Exit, Interruption Handling, Speaker Lock, Event Observability e Server-side Webhooks.
- **Código (MIT):** `github.com/AgoraIO-Conversational-AI/agent-samples` e `server-custom-llm` (Python, Node e Go).

---

## 11. Arquitetura técnica

```
 [App da pessoa idosa (starter Agora)]──RTC──►[Agora ConvoAI: Deepgram pt-BR → Custom LLM → TTS pt-BR]
        │  RTM: estado do agente / legendas                    │ POST /chat/completions?sid=…  (SSE)
        │                                                      ▼
        │                                         [Prosa — FastAPI, 1 processo]
        │                                          ├─ persona Gabriel + brincadeiras (function calling)
        │                                          ├─ minuto dos bichos sem LLM (latência ~0)
        │                                          ├─ registro das falas → medidas de texto
        └─ gravador.js ── áudio da sessão ───────► ├─ medidas acústicas (Praat / parselmouth)
                                                   ├─ linha de base individual → semáforo
                                                   ├─ SQLite (só medidas e texto)
                                                   └─ /painel da família
```

### Captura do áudio
- **Plano A (o da receita Thymia):** `go-audio-subscriber` com o SDK nativo da Agora, recebendo o áudio do canal no servidor.
- **Plano B (implementado):**
  - O `gravador.js` abre uma segunda captura do microfone no navegador, com `noiseSuppression: false`, `autoGainControl: false` e `echoCancellation: true`.
  - Grava a sessão e envia ao fim.
  - Usar **fone de ouvido** na demo.
- **Decisão até 17h de sábado:** se o Go não compilar, seguir com o B.

### Medidas
| Tipo | Medida | Sinal de mudança |
|---|---|---|
| Voz | Velocidade de articulação (sílabas/s) | ↓ lentificação |
| Voz | Proporção e duração das pausas (0,25–2 s) | ↑ |
| Voz | Variação do tom (semitons) | ↓ monotonia |
| Voz | F0 média, jitter, shimmer, HNR | qualidade vocal |
| Texto | Palavras por turno | ↓ |
| Texto | Variedade de vocabulário (MATTR) | ↓ |
| Tarefa | Bichos diferentes em 1 min | ↓ fluência |
| Tarefa | Lembrar 3 palavras / dia da semana | memória e orientação |

### Regra do semáforo
- **Linha de base:** as 5 primeiras conversas. Com menos de 3, o status é "calibrando".
- **Z-score** de cada medida contra a linha de base, com desvio mínimo relativo para evitar falso alarme.
- 🟡 **Amarelo:** 2 ou mais medidas pioram pelo menos 2 desvios.
- 🔴 **Vermelho:** o amarelo se repete na conversa seguinte.
- **Mensagem para a família:** "velocidade da fala −12%, tempo em pausas +36%…", **sem nome de doença**.

---

## 12. Código já escrito (prosa.zip)

**Estado:** os **9 testes automatizados passam**. Ainda **não foi testado com o agente real da Agora**, porque depende das chaves do time.

```
prosa/
├─ README.md              # problema, uso da Agora, como rodar, preexistente × feito, limitações, LGPD
├─ requirements.txt  .env.example  .gitignore
├─ prosa/
│  ├─ app.py              # FastAPI: /chat/completions, /api/pessoas, /api/sessoes, /audio, /finalizar, /painel
│  ├─ custom_llm.py       # SSE, ferramentas, minuto dos bichos sem LLM, registro das falas
│  ├─ persona.py          # prompt do Gabriel, palavras de memória, definição das tools
│  ├─ agora.py            # propriedades do join (pt-BR, Custom LLM, TTS, turnos), join/update/leave
│  ├─ db.py               # SQLite: pessoas, sessões, falas
│  ├─ config.py
│  └─ analysis/
│     ├─ acoustic.py      # medidas de voz (parselmouth) + conversão ffmpeg
│     ├─ linguistic.py    # contagem de bichos, memória, orientação, MATTR
│     └─ baseline.py      # z-score vs. a própria pessoa → semáforo e mensagem
├─ web/
│  ├─ painel.html         # painel da família (selo "DADOS SIMULADOS")
│  ├─ gravador.js         # captura do áudio no navegador (plano B)
│  └─ chart.umd.js        # Chart.js 4.4.1 (MIT) local: a demo não depende de CDN
├─ scripts/
│  ├─ seed_simulado.py    # Dona Cida, 78: 14 dias simulados (10 estáveis + 4 com mudança)
│  ├─ validar.py          # teste-reteste: CV intra × entre pessoas + ICC(1)
│  └─ analisar_audio.py   # mede um arquivo de áudio direto
└─ tests/test_prosa.py    # 9 testes: acústica, texto, linha de base, SSE/tools, fluxo HTTP
```

### Rodar
```bash
pip install -r requirements.txt        # requer ffmpeg
cp .env.example .env                   # preencher AGORA_*, LLM_API_KEY, PUBLIC_BASE_URL, CUSTOM_LLM_KEY
uvicorn prosa.app:app --port 8000
cloudflared tunnel --url http://localhost:8000
python -m scripts.seed_simulado        # abrir /painel?pessoa=1
python -m pytest -q
```

### Integração com o starter (3 mudanças)
1. Antes de iniciar o agente, o backend do starter chama `POST /api/sessoes` com `{pessoa_id, canal, token, uid_usuario}` e usa o `agent_properties` devolvido. A alternativa é mandar `iniciar_agente: true`.
2. No front: `new ProsaGravador(API).iniciar(sid)` ao começar a conversa.
3. Ao encerrar: `parar()`, que envia o áudio, finaliza a sessão e devolve o semáforo.

### Variáveis de ambiente
`AGORA_APP_ID`, `AGORA_CUSTOMER_ID`, `AGORA_CUSTOMER_SECRET`, `PUBLIC_BASE_URL`, `CUSTOM_LLM_KEY`, `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` (padrão gpt-4.1-mini), `TTS_API_KEY`, `TTS_VOICE` (coral), `SILENCE_MS` (1000), `FLUENCY_SECONDS` (60), `BASELINE_SESSIONS` (5).

### A verificar na primeira conversa real
- Se o histórico com `tool_calls` que a Agora devolve está no formato da OpenAI.
- Onde o código do `agora init` monta as propriedades do agente, para trocá-las pelas do Prosa.
- Se o áudio fica limpo com fone de ouvido.

---

## 13. Dados: reais, simulados e validação

**Reais (do time)**
- De 3 a 5 sessões por integrante, com termo de consentimento simples.
- Guardar **só medidas**. O áudio é apagado automaticamente.

**Simulados (identificados)**
- Dona Cida, 78 anos: 14 dias, 10 estáveis e 4 com deriva (fala mais lenta, mais pausas, menos entonação, menos bichos).
- O selo **"DADOS SIMULADOS"** e o asterisco aparecem no painel e precisam aparecer no slide.
- Resultado do seed: calibrando nos dias 1–3, verde nos dias 4–11, amarelo no dia 12, vermelho nos dias 13–14.

**Validação (10% da nota)**
1. **Teste-reteste:** `scripts/validar.py` calcula a variação dentro da mesma pessoa contra a variação entre pessoas, e o ICC(1) para cada medida.
2. **Sessão alterada:** um integrante fala devagar e cansado de propósito. O sistema detecta?
3. **Experiência:** tempo médio de resposta do agente (eventos RTM) e interrupções bem tratadas.
4. **Limitações declaradas:** amostra pequena, jovem, sem validação clínica, medidas dependentes de microfone.

---

## 14. Roadmap até a entrega

| Horário | Fase | Ponto de controle |
|---|---|---|
| 13:15–13:45 | Kickoff | Escopo fechado, papéis, repo, contas Agora com o e-mail da inscrição |
| 13:45–16:00 | Fundação | ✅ **16h:** starter rodando em pt-BR e ligado ao Custom LLM pelo túnel |
| **17:00** | Decisão | Go-audio-subscriber (plano A) ou gravador no navegador (plano B) |
| 16:00–20:00 | Núcleo | ✅ **20h:** cada sessão salva as medidas no banco |
| 20:00–00:00 | Inteligência e painel | ✅ **00h:** conversa → medidas → semáforo no painel |
| 00:00–04:00 | Dados e validação | Gravações do time, teste-reteste, latência, correção de bugs |
| 04:00–07:30 | Descanso em turnos | Pelo menos 2 pessoas dormem |
| **08:00** | 🧊 Code freeze | Só bugfix. Tag `v1.0-hackathon` |
| 08:00–09:30 | Vídeo | 3 takes, narração, upload não listado |
| 08:00–10:30 | Pitch | Slides (≤ 10), descrição, README |
| 10:30–11:30 | Ensaios | 3 ensaios cronometrados + simulação de perguntas |
| **11:30** | 📤 Submissão | Testar todos os links em aba anônima |
| 13:00 | Pitch | 3 + 2 + 3 min |

**Regra:** se um ponto de controle atrasar mais de 1h, **cortar escopo** ou chamar um mentor da Agora na hora.

**Escopo do MVP**
- **Tem que ter:** conversa em pt-BR com interrupção, Custom LLM com 2 brincadeiras, 6 medidas, semáforo e painel.
- **Bom ter:** jitter/shimmer/HNR, Update API adaptando a conversa, memória entre sessões, lembrete de remédio.
- **Fora:** diagnóstico, modelo de doença treinado, login, app nativo, hardware.

---

## 15. Divisão do time

| Pessoa | Sábado à tarde | Sábado à noite | Domingo |
|---|---|---|---|
| **A — Voz/Agora** | Starter, agente pt-BR, TTS, turnos | Latência e interrupção | Opera a demo ao vivo |
| **B — Backend** | Custom LLM + tools ligado ao starter | Update API, memória, banco | README e repositório final |
| **C — Dados/áudio** | Captura do áudio (plano A ou B) | Medidas, linha de base, alerta | Slide de validação |
| **D — Produto/pitch** | Painel e roteiro da demo | Gravações do time e consentimento | Vídeo, slides, apresenta |

---

## 16. Pitch, slides e demo

### Slides (≤ 10)
1. **Gancho:** "Sua mãe mora sozinha. Quando foi a última vez que vocês conversaram de verdade?"
2. **Problema:** 32,1 milhões de idosos (Censo 2022). A solidão aumenta o risco de morte em 14–32% e o de depressão e demência (OMS). Sinais aparecem na fala antes do diagnóstico.
3. **Solução:** Prosa, conversa diária, percepção de mudança e aviso à família.
4. **Demo** (ou vídeo).
5. **Como funciona:** diagrama com a Agora no centro (ConvoAI, Custom LLM, captura de áudio, RTM, Update API).
6. **Ciência:** meta-análise (cerca de 0,8 de sensibilidade em triagem), Cordio (24,6 dias antes), SPIRA/USP.
7. **Por que comparar com a própria pessoa:** contorna a falta de modelos em português. É a lógica do HearO.
8. **Validação:** números do teste do time e limitações honestas.
9. **Mercado e modelo:** planos de saúde, residenciais, famílias (B2B2C).
10. **Próximos passos:** piloto com parceiro clínico, validação em pt-BR, LGPD, Anvisa se um dia virar diagnóstico.

### Roteiro do pitch (3 min)
- 0:00–0:30: gancho e problema
- 0:30–1:15: solução e por que voz
- 1:15–2:15: como funciona com a Agora e a ciência por trás
- 2:15–3:00: validação, limitações e visão

### Roteiro da demo e do vídeo (2 min)
1. O Gabriel cumprimenta pelo nome. A conversa flui.
2. O idoso **interrompe** e o Gabriel para e escuta. Isso mostra o critério de voz.
3. Brincadeira das 3 palavras.
4. Minuto dos bichos, com o Gabriel respondendo "Isso! Continue…".
5. Painel verde com a linha de base.
6. Sessão "alterada" (fala lenta, mais pausas): o semáforo fica 🟡, e na próxima conversa o Gabriel pergunta com carinho como a pessoa dormiu.
7. Fechar com "não diagnostica, percebe mudanças".

### Palavras proibidas
❌ "diagnostica", "detecta Alzheimer", "prevê doença", "sua voz indica"
✅ "percebe mudanças", "acompanha", "avisa a família", "orienta procurar um profissional"

---

## 17. Perguntas prováveis da banca

| Pergunta | Resposta |
|---|---|
| Isso diagnostica? | Não. Acompanha mudanças em relação à própria pessoa e orienta procurar o médico. |
| Como validaram? | Teste-reteste com as vozes do time e uma sessão alterada. A validação clínica é o próximo passo, com um parceiro. |
| Funciona em português? | Por isso comparamos a pessoa com ela mesma, sem depender de modelo treinado em inglês. |
| E o falso alarme? | Só alertamos mudança persistente em várias medidas e sessões, e sempre orientamos, nunca afirmamos. |
| LGPD? | Consentimento específico do idoso ou do responsável. Áudio apagado na hora. Família vê tendências, não gravações. |
| Onde exatamente entra a Agora? | Conversa em tempo real, ASR pt-BR, interrupção, Custom LLM com tools, RTM, Update API e o áudio da conversa como fonte das medidas. |
| Por que não usar só um app de perguntas? | O idoso conversa, não preenche formulário. E a voz carrega sinais que o texto não tem. |
| Quem paga? | Planos de saúde (evitar internação), residenciais e famílias por assinatura. |
| E se o idoso estiver resfriado? | Uma sessão alterada sozinha não gera vermelho. Exigimos persistência. |
| Qual a diferença para a Cordio ou a Thymia? | Foco no idoso brasileiro, em português, com companhia diária, e começando por bem-estar, sem barreira regulatória. |

---

## 18. Riscos e planos B

| Risco | Plano B |
|---|---|
| Go-audio-subscriber não compila | Gravador no navegador (já implementado) |
| Deepgram pt-BR falha | Testar ARES pt-PT ou outro ASR da lista (Microsoft, Google, Speechmatics) |
| TTS OpenAI com chave/limite | MiniMax ou Cartesia em modo gerenciado |
| Custom LLM com latência alta | Modelo menor (gpt-4.1-mini / gpt-5-nano), filler words, `max_history` menor |
| Túnel cai na demo | Vídeo gravado (permitido pelo regulamento) |
| Wi-fi do evento ruim | Hotspot de celular reserva; vídeo pronto às 9h30 |
| Ruído do ambiente | Fone com microfone; Speaker Lock (receita da Agora) |
| Atraso geral | Cortar o "bom ter"; o painel com seed já garante a narrativa |

---

## 19. Checklists

### Antes de codar
- [ ] Equipe (3–5) cadastrada no OS
- [ ] Contas Agora com o **e-mail da inscrição**, créditos ativos
- [ ] App ID, Customer ID e Customer Secret no `.env` (nunca no git)
- [ ] Perguntar ao Yan (Agora) sobre chave da Thymia e dúvidas de integração

### Submissão (até 11h30)
- [ ] **Descrição:** problema, público, solução, uso da Agora
- [ ] **Slides** ≤ 10 (PDF)
- [ ] **Vídeo** ≤ 2 min, narrado, interação real + Agora, link acessível
- [ ] **Repo público** com README (execução, dependências, versão `v1.0-hackathon`)
- [ ] Preexistente × feito no hackathon identificado no README
- [ ] Simulações identificadas (painel, slide, vídeo)
- [ ] Nenhuma chave, áudio ou dado pessoal no repo
- [ ] Links testados em **aba anônima**

### Antes do pitch
- [ ] 3 ensaios cronometrados (3 min + 2 min)
- [ ] Vídeo aberto em outra aba como plano B
- [ ] Fone + microfone testados no local
- [ ] Respostas da seção 17 treinadas

---

## 20. Fontes

**Hackathon**
- Regulamento UNMUTE (versão de 17/11/2026) e apresentação de abertura, ambos nos docs do projeto

**Agora**
- Docs: https://docs.agora.io/en/ai
- Join: https://docs.agora.io/en/api-reference/api-ref/conversational-ai/join
- Update: https://docs.agora.io/en/api-reference/api-ref/conversational-ai/update
- Custom LLM: https://docs.agora.io/en/ai/build/custom-model-integration/custom-llm
- Modo gerenciado: https://docs.agora.io/en/ai/build/managed-mode
- ARES (idiomas): https://docs.agora.io/en/ai/models/asr/ares
- Estado do agente (RTM): https://docs.agora.io/en/ai/best-practices/get-agent-state
- Gravação de conversas: https://docs.agora.io/en/ai/best-practices/record-agent-conversation
- Áudio bruto: https://docs.agora.io/en/realtime-media/rtc/build/customize-audio-processing/stream-raw-audio
- Receitas: https://docs.agora.io/en/api-reference/recipes · https://recipes.agora.io/recipes/thymia-biomarkers · https://recipes.agora.io/recipes/wellness-coach
- Código: https://github.com/AgoraIO-Conversational-AI/agent-samples

**Ciência**
- NIH Bridge2AI-Voice: https://physionet.org/content/b2ai-voice/4.0.0/ · https://www.usf.edu/health/news/2024/bridge2ai-voice-data-release.aspx
- Meta-análise (BMJ EBM 2025): https://www.epistemonikos.org/en/documents/084beaf4f9ab862ecddfd7ef83e47107d03cc5a8
- Revisão sistemática de distúrbios neurológicos (Frontiers, 2022): https://pmc.ncbi.nlm.nih.gov/articles/PMC9309252
- Framingham (MCI/demência): https://www.osti.gov/pages/servlets/purl/1976265
- Miami (pausas no MCI): https://news.med.miami.edu/post-pause-speech-patterns-detect-mild-cognitive-impairment/
- UT Southwestern: https://utsouthwestern.edu/newsroom/articles/year-2023/april-alzheimers-in-speech-patterns.html
- Columbia Nursing: https://news.columbia.edu/news/cues-speech-and-voice-signal-earliest-stages-dementia
- Parkinson com voz de celular: https://link.springer.com/10.1038/s41598-023-47568-w
- Cordio DETECT-HF: https://cardiovascularbusiness.com/topics/clinical/heart-failure/voice-changes-may-detect-worsening-heart-failure-weeks-other-symptoms-appear · https://www.dicardiology.com/node/85596
- SPIRA/USP: https://agencia.fapesp.br/50844 · https://spira.ime.usp.br/en/2026/01/21/quando-a-voz-revela-o-folego-inteligencia-artificial-identifica-insuficiencia-respiratoria-com-quase-100-de-precisao/
- Generalização entre línguas: https://doaj.org/article/62e05ff89db04fccbc81345665cf3231 · https://pubmed.ncbi.nlm.nih.gov/35385224/
- Kintsugi: https://bhbusiness.com/2026/02/11/mental-health-voice-biomarker-kintsugi-closes-makes-all-technology-and-research-public/

**Brasil, regulação e saúde pública**
- IBGE Censo 2022 (60+): https://agenciadenoticias.ibge.gov.br/agencia-noticias/2012-agencia-denoticias/noticias/38186-
- Anvisa RDC 657/2022 (P&R): https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2022/software-como-dispositivo-medico-perguntas-e-respostas/perguntas-respostas-rdc-657-de-2022-v1-01-09-2022.pdf/@@download/file
- LGPD (Lei 13.709/2018): https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm
- OMS (isolamento e solidão): https://www.who.int/groups/technical-advisory-group-on-social-connection-%28tag-sc%29 · https://who.int/news/item/30-06-2025-social-connection-linked-to-improved-heath-and-reduced-risk-of-early-death
