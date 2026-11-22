# Roteiro do vídeo (≤ 2:00) · UNMUTE

**Formato:** gravação de tela com o hub (esquerda) e a central (direita) lado a lado. O apresentador narra e interpreta a Dona Helena com o microfone do notebook. O áudio do Gabriel precisa ficar audível no vídeo.
**Antes de gravar:** abra `/dashboard` e `/hub` (sem `?dev`), clique em **Ativar hub**, confira "Escuta Edge Local Ativa" e deixe o DevTools fechado.

| Tempo | Tela | Narração (voz do apresentador) |
|---|---|---|
| 0:00–0:12 | Hub em espera + central verde | "Entre uma visita e outra do Home Care, o idoso fica sozinho. Esquece o remédio, cai, piora, e ninguém fica sabendo. O UNMUTE resolve isso só com voz." |
| 0:12–0:20 | Topo do hub: "Escuta Edge Local Ativa" | "Em espera, o hub escuta só no próprio aparelho. Nenhum áudio vai para a nuvem." |
| 0:20–0:45 | Clique em "Simular horário do check-in (8h)". O Gabriel cumprimenta e a Helena responde normal | "No horário do remédio, o Gabriel, nosso agente na Agora Conversational AI, faz o check-in. A Dona Helena responde no ritmo dela, cerca de 1,2 segundo, e a central fica verde." |
| 0:45–1:15 | Pergunta da Losartana: pausa de ~4 s, "hum… acho que… não lembro" | "Agora ela hesita. O turn detection da Agora espera, sem atropelar. O Gabriel acolhe, e a central fica **vermelha**: latência 200% acima da linha de base pessoal e remédio não confirmado." |
| 1:15–1:20 | Gabriel se despede; hub: "Avisei a enfermagem" | "A enfermeira recebe a ação recomendada: ligar agora." |
| 1:20–1:45 | Hub em espera: a Helena diz "Socorro!" | "E se ela cair? A palavra 'socorro' é reconhecida no próprio aparelho. A central recebe o alerta pelo Agora Signaling **antes** de o Gabriel falar, e o Gabriel verifica por voz." |
| 1:45–1:55 | "Foi só um barulho, estou bem" → central volta a verde | "Se for só um barulho, a verificação ativa descarta o falso alarme sem acionar ninguém." |
| 1:55–2:00 | Logo / título | "UNMUTE: menos cliques, mais cuidado. Feito com Agora." |

**Checklist da gravação:**
- [ ] Gravado **até 08:00** de 22/11, com 2:00 ou menos
- [ ] Vídeo mostra a interação real (sem cortes no meio das respostas)
- [ ] Link não listado (YouTube) ou arquivo pronto para a plataforma
