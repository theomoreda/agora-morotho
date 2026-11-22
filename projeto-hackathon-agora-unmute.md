# [Nome do projeto] — Treinamento e avaliação de vendedores com IA por voz

> Projeto para o **Hackathon Unmute da Agora**
> Status: em definição (nome, precificação e diferencial ainda em aberto)

---

## 1. Resumo

Plataforma onde o **gestor comercial** transforma o material da empresa (produtos, políticas, processo de vendas) em **simulações de conversa por voz** com clientes virtuais. Os **vendedores** praticam e são avaliados por IA, e o gestor acompanha a evolução da equipe em escala, sem precisar conduzir cada roleplay manualmente.

Não vendemos "roleplay com IA". Vendemos a capacidade de uma empresa **treinar, avaliar e certificar** seus vendedores em escala.

---

## 2. O problema

Empresas que dependem de equipes de vendas precisam garantir que centenas de vendedores estejam preparados para conversar com clientes. Hoje isso costuma ser confirmado por **roleplay, em média uma vez a cada dois meses**.

Pense em um vendedor recém-contratado. Ele precisa aprender:

- o produto e suas características;
- como identificar a necessidade do cliente;
- como responder e contornar objeções;
- como negociar e conduzir o fechamento;
- como lidar com **perfis de cliente diferentes** (personas) e **objeções variadas**.

O gestor não consegue fazer isso sozinho com toda a equipe. Ele precisa de uma ferramenta.

### Três dores diferentes

| Quem | Dor |
|---|---|
| **Gestor** | Não consegue avaliar e treinar individualmente todos os vendedores com frequência; o treino depende da disponibilidade dele e acaba irregular. |
| **Empresa** | Não tem segurança de que todos dominam os produtos, sabem lidar com objeções e seguem o processo comercial. |
| **Vendedor** | Recebe materiais e apresentações, mas nem sempre pratica conversas reais antes de falar com clientes. Conhecer o produto não é saber vendê-lo. |

---

## 3. Evidências de mercado

### Tamanho do mercado
- Mercado global de *sales training software*: **~US$ 2,7 bilhões**, com crescimento anual projetado de **~15%**.
- Brasil: estimativa de **~US$ 42 milhões em 2024**, com projeção de **quase US$ 100 milhões até 2030**.

### Salesforce — State of Sales (7ª edição, 2026)
Pesquisa com **4.050 profissionais de vendas em 22 países** (incluindo 250 brasileiros):

- **60%** do tempo semanal dos vendedores vai para atividades que não são venda direta.
- **52%** dizem que os materiais tradicionais de treinamento não oferecem as habilidades necessárias.
- **46%** raramente recebem feedback sobre suas conversas comerciais.
- **41%** não têm oportunidades suficientes de praticar roleplay antes de atender clientes.
- **38%** das equipes apontam a falta de tempo dos gestores como obstáculo ao desenvolvimento.
- Apenas **26%** das equipes oferecem roleplay como parte da capacitação.
- **34%** das equipes que já usam agentes de IA os empregam em coaching (simulações e dicas personalizadas).

### Evidência de eficácia
- Estudo da **University of Houston**, *"Do AI Role Plays Improve Salesperson Performance?"*, com quase **2.000 vendedores** de uma grande empresa industrial dos EUA: o uso de roleplays com IA **aumentou em ~2% a performance média** dos vendedores.

---

## 4. A solução

Um sistema em que o gestor cria os casos de treino e o vendedor pratica conversando por voz com um cliente virtual que **reage de forma dinâmica** (sem roteiro fixo), seguido de avaliação automática.

Podemos pensar na solução como um **bot que treina certinho**, quase um **jogo conversacional** que treina exatamente os pontos que o vendedor precisa dominar.

### Experiência do gestor
1. **Biblioteca de conhecimento:** adiciona materiais, apresentações, manuais, catálogos, políticas comerciais e processos de vendas.
2. **Criação de cenários:** define produto, tipo de abordagem, perfil do cliente, objeções, nível de dificuldade e objetivo da conversa.
3. **Critérios de avaliação:** define o que será avaliado e o peso de cada critério.
4. **Distribuição:** atribui cenários aos vendedores, define prazos e reavaliações.
5. **Acompanhamento:** vê notas, dificuldades recorrentes, evolução individual e da equipe.

### Experiência do vendedor
- Recebe uma simulação e conversa por voz com um cliente virtual, que pode ser, por exemplo:
  - interessado, mas desconfiado;
  - conhece o concorrente;
  - acha o produto caro;
  - não entende as características técnicas;
  - exige condições especiais;
  - quase fechando, mas com uma última objeção.
- Ao terminar, recebe **avaliação e indicações do que melhorar**.

### Ideia de evolução: treinamento adaptativo
Se um vendedor tira 90 em conhecimento do produto, 85 em descoberta de necessidades e 40 em negociação, o próximo treino foca em negociação. A plataforma recomenda e monta o próximo cenário a partir das falhas identificadas, sem o gestor precisar criar cada exercício à mão.

---

## 5. Avaliação (rubrica)

A nota **não pode ser um número arbitrário de um LLM**. Proposta: rubrica com critérios observáveis, pesos definidos pelo gestor e evidências da conversa que justificam cada nota.

Exemplo de pesos (ilustrativo, configurável pelo gestor):

| Critério | Peso |
|---|---|
| Conhecimento do produto | 25% |
| Descoberta de necessidades | 20% |
| Argumentação | 20% |
| Contorno de objeções | 20% |
| Fechamento | 15% |

O sistema deve:
- citar trechos da conversa que justificam cada nota;
- apontar informações incorretas ditas pelo vendedor;
- indicar critérios que não foram demonstrados;
- usar o material cadastrado como **fonte de verdade**, com regra clara para perguntas sobre algo que não está documentado (o agente não deve inventar nem ensinar informação errada).

---

## 6. Concorrência

Já existem produtos nessa categoria. O principal é o **PitchMonster**, com simulações em 29 idiomas, personas, scorecards, certificações e dashboards gerenciais (dados divulgados pela própria empresa). Outros nomes relevantes do setor: Second Nature, Mindtickle.

**Conclusão:** não estamos criando uma categoria nova, estamos entrando em uma categoria já conhecida. Biblioteca de documentos + personas + roleplay + nota personalizada + dashboard, por si só, **não é diferencial**.

---

## 7. Diferencial competitivo

**Ainda não definido.**

Hipóteses em avaliação (a decidir):

- **A. Especialização em um segmento** (ex.: seguros, concessionárias, imobiliárias, B2B): cenários, critérios e processos já prontos para aquele mercado.
- **B. Certificação comercial:** o gestor sabe objetivamente quem está apto a vender determinado produto, com reavaliação quando produto, preço ou política mudam.
- **C. Inteligência conectada às vendas reais:** cruzar resultados das simulações com CRM e conversão real.
- **D. Foco no treino que o vendedor precisa:** o jogo conversacional que treina exatamente os pontos fracos de cada pessoa (treinamento adaptativo).

---

## 8. Modelo de negócio

> ⚠️ **Os valores abaixo são exemplos e cálculos de referência. A precificação ainda não está definida.**

### Estrutura de custo (estimativa)
- Custo da voz via Agora: **cerca de R$ 0,60 por minuto** (estimativa, dependente do câmbio e do plano).
- 60 minutos por vendedor/mês ≈ **R$ 36 de custo**.

### Exemplo de preço
- Cobrar algo na faixa de **R$ 47,99 a R$ 49,99 por vendedor/mês**.
- Com 1 hora de uso mensal, a margem seria apertada (antes de outros custos como backend, armazenamento, suporte e impostos).
- Como a avaliação é recorrente a cada ~2 meses, o consumo médio tende a ser menor, o que melhora a margem.
- Ponto de atenção: **não vender minutos ilimitados**, pois a margem depende de controlar o consumo de voz.

### Modelo
SaaS recorrente, cobrado por vendedor, com franquia de minutos. Possível taxa de implantação para configurar materiais e cenários da empresa (a medir).

---

## 9. MVP para o hackathon

Escopo enxuto, apenas quatro partes:

1. **Painel do gestor:** cadastro de produto, materiais, regras comerciais e critérios de avaliação.
2. **Construtor de simulações:** persona, objeções, dificuldade, objetivo e comportamento esperado do cliente.
3. **Simulação por voz:** vendedor conversa com o cliente virtual, com interrupções e respostas dinâmicas usando a **Agora**.
4. **Avaliação e dashboard:** pontuação individual, justificativa por critério, erros identificados e visão geral da equipe.

**Fora do escopo do MVP:** integração com CRM, certificação avançada, múltiplos tipos de usuário, avatares, gamificação complexa.

### Demo sugerida
1. O gestor cadastra um produto.
2. Cria 3 perfis de cliente.
3. Envia uma avaliação para 2 vendedores.
4. Um vendedor domina o produto e o outro comete erros.
5. O gestor compara as avaliações e vê exatamente onde cada um precisa melhorar.

---

## 10. Tecnologia

- **Voz em tempo real / agente de IA conversacional:** Agora (ASR, LLM e TTS no fluxo de conversa).
- **Backend, banco de dados e armazenamento:** a definir.
- **Avaliação pós-conversa:** LLM com rubrica estruturada e evidências.
- **Base de conhecimento:** materiais da empresa como fonte de verdade para o agente.

---

## 11. Validação (pós-hackathon)

Piloto sugerido: **1 empresa, 20 a 30 vendedores, 4 semanas.**

- **Semana 1:** gestor cadastra materiais e cria 3 cenários.
- **Semana 2:** primeiro roleplay dos vendedores.
- **Semana 3:** práticas personalizadas conforme as dificuldades.
- **Semana 4:** nova avaliação com cenários equivalentes, mas diferentes.

Métricas:
- tempo que o gestor gasta avaliando a equipe (antes e depois);
- percentual de aprovados;
- evolução por competência;
- concordância entre notas da IA e de avaliadores humanos;
- frequência de uso;
- feedback dos gestores.

Pergunta-chave para o gestor que originou a ideia: **quanto tempo ele gasta para avaliar toda a equipe a cada dois meses, e quantos vendedores ficam sem avaliação por falta de tempo?**

---

## 12. Riscos e pontos em aberto

- Diferenciação frente ao PitchMonster ainda não provada.
- Margem sensível ao consumo de minutos de voz.
- Qualidade e confiabilidade da nota gerada por IA.
- Risco de o agente alucinar informações sobre o produto.
- Nome, precificação e diferencial ainda não definidos.

---

## 13. Links

- Hackathon: https://newhack.vc/hackathon/agora#inscricao
- Agora: https://www.agora.io/en/
- Agora Recipes: https://recipes.agora.io/
- Agora Docs: https://docs.agora.io/en/introduction
