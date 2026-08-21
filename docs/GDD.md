# ENCANTARIA: Vila do Ipê
### Game Design Document — MVP v1.0

> Documento de design completo, pronto para ser entregue a uma equipe de programação (humana ou IA) e transformado em protótipo. Todas as decisões abaixo são definitivas para o MVP; alternativas descartadas estão marcadas como **[Decisão de Design]** quando relevante.

---

## Sumário

1. Nome do jogo · 2. Pitch · 3. Premissa · 4. História principal · 5. Lore do Encantado · 6. Mapa inicial · 7. Loop de gameplay · 8. Atributos · 9. Níveis · 10. Classes · 11. Árvores de habilidade · 12. Especializações · 13. Profissões · 14. Combate · 15. Armas · 16. Armaduras · 17. Loot · 18. Crafting · 19. Agricultura · 20. Pesca · 21. Mineração · 22. Casa e construção · 23. Economia · 24. NPCs · 25. Amizade · 26. Relacionamentos · 27. Inimigos · 28. Boss: Carcará de Ferro · 29. Dungeon Mina Santa Luzia · 30. Quests iniciais · 31. Eventos aleatórios · 32. Dia/noite · 33. Clima · 34. Perturbação da Mata · 35. Interface mobile · 36. Controles · 37. Inventário · 38. Save system · 39. Tutorial (30 min) · 40. Progressão (5h) · 41. MVP técnico · 42. Fora do MVP · 43. Roadmap · 44. Engine · 45. Estrutura de dados · 46. Arquitetura de código · 47. Organização de cenas · 48. Sistema de diálogos · 49. Sistema de quests (técnico) · 50. Sistema de combate (técnico) · 51. IA dos inimigos · 52. Sistema de bosses (técnico) · 53. Sistema de itens · 54. Sistema de classes/habilidades · 55. Persistência · 56. Otimização Android · 57. Resoluções de tela · 58. Direção de arte · 59. Direção sonora · 60. Próximos passos

---

## 1. Nome do jogo

Dez opções avaliadas:

1. Vila do Ipê: Crônicas do Encantado
2. Raízes do Encantado
3. Terra Encantada: Vila do Ipê
4. O Chamado da Mata
5. **Encantaria**
6. Sertão Encantado
7. Vila do Ipê: A Trilha do Encantado
8. Caminhos do Encantado
9. Luz da Serra
10. Brasil Encantado: Vila do Ipê

**Escolhido: Encantaria**, com subtítulo **"Vila do Ipê"** para o primeiro capítulo (`Encantaria: Vila do Ipê`).

Justificativa: é uma palavra original (sufixo "-aria" como em "feitiçaria", "assombração"), curta, fácil de pronunciar em qualquer idioma, não descreve literalmente o jogo (evita ficar datada se o escopo crescer) e funciona como **nome de franquia** — cada região futura vira um novo "capítulo" dentro do mesmo universo Encantaria, sem precisar renomear o produto. Nomes como "Sertão Encantado" prendem a marca a um bioma específico; "Encantaria" não.

---

## 2. Pitch de uma frase

> De manhã você planta mandioca, conserta a cerca e conversa com os vizinhos na Vila do Ipê; à noite você pega um facão encantado e entra na mata para investigar uma criatura que talvez não seja, afinal, sua inimiga.

---

## 3. Premissa

O jogador herda um pequeno sítio abandonado nos arredores da Vila do Ipê, uma comunidade de agricultores, pescadores, garimpeiros e comerciantes situada entre mata atlântica, serra e rio. Os primeiros dias são sobre reconstruir a casa, aprender ofícios e conhecer os moradores.

Mas pequenos sinais começam a se acumular: animais desaparecendo, luzes na mata à noite, o rio "errado" em certas noites de lua. A vila foi construída, sem que ninguém soubesse, perto de um **Veio do Encantado** — um ponto de contato entre o mundo humano e o plano sobrenatural. Algo está contaminando esse Veio, e o jogador — ao se tornar a primeira pessoa em gerações a "despertar" para essa realidade — é quem vai precisar investigar.

O jogo não revela isso de cara. As primeiras horas são deliberadamente sobre rotina, comunidade e conforto; o sobrenatural entra em camadas.

---

## 4. História principal

**Ato 0 — Chegada (0–30 min):** tutorial. O jogador chega, reforma a casa, aprende movimentação, ferramentas básicas, primeiro combate contra um Rato-do-Mato Corrompido no quintal.

**Ato 1 — A Vila (30 min – 1h30):** rotina se estabelece. Missões pessoais de NPCs. Rumores de animais sumindo perto da Mina Santa Luzia. O jogador entra na mina pela primeira vez com um NPC (Seu Osvaldo, o minerador).

**O Despertar (~1h):** dentro da mina, o jogador toca uma raiz negra pulsante e tem uma visão. A partir daqui o HUD de classe se abre — o jogador escolhe sua primeira classe (Seção 7 do lore, detalhado abaixo).

**Ato 2 — O Carcará de Ferro (1h30 – 3h):** investigação leva à câmara profunda da mina. Boss fight. Ao morrer, a criatura se revela vítima, não vilã, e deixa o **Fragmento do Encantado**.

**Ato 3 — A Revelação (3h+, fora do MVP mas roteirizado):** Dona Micaela (NPC anciã) reconhece as inscrições do Fragmento e explica os Veios do Encantado. A Mina Santa Luzia é apenas um deles. A trama se expande para uma rede nacional de Veios sendo corrompidos — gancho para expansões regionais futuras.

O MVP entrega o Ato 0 ao Ato 2 por completo (3–5h de conteúdo), terminando com o gancho do Ato 3 como epílogo narrativo, sem exigir novo conteúdo jogável.

---

## 5. Lore do Encantado

O **Encantado** é o plano sobrenatural brasileiro: não é "inferno" nem "céu", é uma camada paralela onde vivem entidades do folclore, memórias coletivas e forças da natureza personificadas. Ele não é hostil por natureza — é **selvagem**, como a própria mata: pode proteger, punir ou ignorar, dependendo de como é tratado.

**Veios do Encantado** são pontos fracos entre os dois mundos — cachoeiras, encruzilhadas antigas, minas, grutas, certas árvores centenárias. Perto de um Veio, magia "vaza" para o mundo humano: por isso a Vila do Ipê tem tanta fartura (terra fértil, peixes abundantes) e também tanto risco.

Algo (a ser revelado em expansões futuras — um antagonista ainda sem nome definitivo, provisoriamente chamado internamente de **"A Raiz"**) está **envenenando os Veios**, corrompendo criaturas e vegetação ao redor deles em raízes negras. O Carcará de Ferro é a primeira vítima que o jogador encontra — não o causador.

Regra de design fixa: **nem toda entidade sobrenatural é inimiga**. Curupira, Boitatá e outras entidades maiores são forças neutras ou protetoras que reagem ao comportamento do jogador (ver Seção 34).

---

## 6. Mapa inicial

Mapa compacto e totalmente conectado a pé, sem loading entre áreas externas (loading apenas ao entrar em interiores/dungeons).

```
                    [Serra da Onça]  (nível 15+, bloqueada no MVP)
                          |
   [Brejo das Lanternas] -+- [Ruínas do Engenho] (bloqueada, gancho futuro)
     (sobrenatural, noturna)      |
                          |       |
[Mata do Cedro] --- [Estrada Velha] --- [Vila do Ipê] --- [Sítio do Jogador]
     |                                        |
[Mina Santa Luzia]                     [Rio das Pedras]
 (dungeon, boss)                       (pesca, exploração)
```

- **Vila do Ipê**: hub central — praça, mercadinho, boteco, capela, oficina.
- **Sítio do Jogador**: adjacente à vila, norte. Casa, terreno de plantio, futuro estábulo/galinheiro.
- **Mata do Cedro**: primeira área selvagem, a oeste. Inimigos de baixo nível, coleta de madeira/ervas.
- **Rio das Pedras**: corta o mapa de norte a sul, entre o sítio e a mata. Pesca, uma ponte quebrada (gancho de progressão — precisa de material para consertar).
- **Mina Santa Luzia**: entrada na base da Mata do Cedro. Dungeon principal do MVP.
- **Estrada Velha**: eixo leste-oeste que liga tudo; NPCs viajantes aparecem nela.
- **Ruínas do Engenho** e **Brejo das Lanternas**: visíveis no MVP mas bloqueadas (uma porta trancada, uma neblina sobrenatural intransponível) — teasers para conteúdo pós-MVP.
- **Serra da Onça**: visível ao fundo (skybox/parallax), inacessível no MVP.

Caminhos secretos: um atalho na Mata do Cedro só é visível à noite (vagalumes marcam a trilha); uma passagem no Rio das Pedras exige a vara de pesca nível 2 para atravessar a nado contra a correnteza.

---

## 7. Loop principal de gameplay

**Loop diário (curto prazo, 5–20 min):**
Acordar → checar plantação/animais → tarefa do dia (missão, exploração, ofício) → interagir com 1–3 NPCs → explorar/combater à tarde ou à noite → voltar e dormir (salva o jogo).

**Loop de sessão (médio prazo, 15–60 min):**
Escolher um objetivo (progredir uma quest, subir um nível de profissão, explorar uma nova sala da mina, craftar um equipamento) → executar → coletar recompensa tangível → checar progressão (nível, amizade, dinheiro) → sessão termina em ponto natural (chegada em casa, fim de missão).

**Loop de progressão (longo prazo, a campanha toda):**
Vida pacata → sinais estranhos → Despertar → primeira classe → primeira dungeon → primeiro boss → revelação → gancho para expansão.

Todo loop entrega pelo menos **uma recompensa visível** por sessão de 5 minutos (item, XP, diálogo novo, moeda) — princípio mobile-first da Seção 24.

---

## 8. Sistema completo de atributos

Seis atributos, 1–20 no MVP (soft cap; pontos adicionais via level up e itens).

| Atributo | Efeito mecânico direto |
|---|---|
| **FOR** (Força) | Dano físico corpo a corpo (+2% por ponto acima de 10), capacidade de carga (+5 kg/ponto), desbloqueia ferramentas pesadas (machado grande, picareta de minério raro) |
| **AGI** (Agilidade) | Velocidade de movimento (+1%/ponto), chance de ESQ, redução de tempo de recarga de ataques rápidos |
| **VIG** (Vigor) | HP máximo (+8/ponto), ST máximo (+4/ponto), redução de duração de status negativos (−2%/ponto) |
| **INT** (Inteligência) | MP máximo (+6/ponto), dano mágico (+2%/ponto), nível de Alquimia mais rápido |
| **ESP** (Espírito) | RES sobrenatural (+3/ponto), eficácia de cura recebida/aplicada (+2%/ponto), desbloqueia diálogos/interações com entidades do Encantado |
| **CAR** (Carisma) | Preços de compra/venda (±1%/ponto), velocidade de ganho de amizade (+2%/ponto), desbloqueia opções de diálogo exclusivas |

Cada ponto investido é **sentido**, não cosmético — regra de design herdada diretamente do brief. Distribuição: 1 ponto por nível (30 no total), mais pontos bônus de marcos de missão principal (~5 pontos ao longo do MVP).

### Status derivados

`HP = 50 + VIG*8 + nível*5`
`ST = 40 + VIG*4 + AGI*2`
`MP = 20 + INT*6 + ESP*2`
`DEF = base_equip + FOR*0.5`
`RES = base_equip + ESP*3`
`CRIT% = 5 + AGI*0.5`
`ESQ% = 5 + AGI*0.7`
`VEL = base + AGI*1%`
`SORTE` = atributo próprio, ganho apenas por itens/eventos raros (não por level-up direto) — mantém-se especial e não "dump stat".

### Efeitos de status

Sangramento (dano/turno), Veneno (dano/turno + reduz cura recebida), Queimadura (dano/turno + reduz DEF), Medo (não pode usar habilidade especial), Maldição (reduz atributo aleatório), Atordoamento (perde 1 ação), Lentidão (−VEL), Regeneração, Proteção (escudo temporário), Bênção (+atributo temporário), Encantamento (arma ganha dano elemental temporário).

---

## 9. Sistema de níveis

- Nível máximo no MVP: **30** (conforme brief; suficiente para a campanha inicial, deixa espaço de expansão para 60+ em capítulos futuros).
- Curva de XP: `XP_necessário(n) = 100 * n^1.5` (crescimento moderado — nível 10 ≈ 3.160 XP, nível 30 ≈ 16.400 XP).
- A cada nível: +1 ponto de atributo livre, +HP/ST/MP conforme fórmulas da Seção 8.
- A cada **5 níveis** (5, 10, 15, 20, 25, 30): ponto de talento — escolha binária exclusiva dentro da árvore da classe (Seção 11). Não há progressão automática de habilidades.
- **Redefinição de talentos**: item raro "Penas de Reconsideração" (craftável tarde no jogo ou drop raro de boss), consome 1 por redefinição completa de árvore.

---

## 10. As 6 classes

O jogador começa **sem classe** (Ato 0). Após o Despertar, escolhe entre:

| Classe | Papel | Atributo principal | Arma típica |
|---|---|---|---|
| Guerreiro | Tank/dano corpo a corpo | FOR | Espada, machado, lança |
| Mateiro | Dano à distância/utilidade | AGI | Arco, armadilhas |
| Encantado (classe jogável) | Dano mágico elemental | INT | Cajado/foco encantado |
| Benzedeiro | Suporte/cura/anti-sobrenatural | ESP | Terço, patuá |
| Alquimista | Dano de área/utilidade | INT | Bombas, frascos |
| Malandro | Dano rápido/controle | AGI | Adagas, berimbau-arma |

**[Decisão de Design]** A classe "Encantado" reaproveita o nome do plano sobrenatural. Isso é proposital e reforça a fantasia (o jogador que "usa" o Encantado vira parte dele), mas exige cuidado de UI para nunca confundir "Encantado (o mundo)" com "Encantado (a classe)" — resolvido na Seção 35 com ícones e cores distintos.

---

## 11. Árvore inicial de habilidades de cada classe

Formato: Nível 1 (habilidade base, automática) → Nível 5 (escolha) → Nível 10 (escolha) → Nível 15 (especialização, Seção 12).

**Guerreiro**
- Nv1: Golpe Básico (combo de 3 hits)
- Nv5: **Golpe Pesado** (dano alto, lento) OU **Contra-Ataque** (janela de parry)
- Nv10: **Investida** (fecha distância + atordoa) OU **Postura Defensiva** (reduz dano recebido, ativa por tempo)

**Mateiro**
- Nv1: Tiro Certeiro
- Nv5: **Tiro Múltiplo** (3 flechas em leque) OU **Armadilha de Rede** (imobiliza)
- Nv10: **Tiro Perfurante** (atravessa inimigos) OU **Camuflagem** (invisibilidade curta)

**Encantado**
- Nv1: Faísca (projétil mágico fraco, sem custo de MP)
- Nv5: **Rajada Elemental** (escolhe elemento ativo: fogo/água/vento/terra) OU **Barreira Arcana** (escudo de MP)
- Nv10: **Explosão Elemental** (dano em área) OU **Invocação Menor** (familiar temporário, gancho para Conjurador)

**Benzedeiro**
- Nv1: Bênção Simples (cura pequena)
- Nv5: **Cura em Área** OU **Escudo Espiritual** (proteção contra dano sobrenatural)
- Nv10: **Remoção de Maldição** OU **Purificação** (dano bônus contra sobrenaturais)

**Alquimista**
- Nv1: Bomba Básica
- Nv5: **Bomba de Fogo** (dano/queimadura) OU **Frasco de Lentidão** (controle)
- Nv10: **Nuvem Tóxica** (dano em área contínuo) OU **Estimulante** (buff de equipe/self)

**Malandro**
- Nv1: Ataque Furtivo (crítico garantido nas costas)
- Nv5: **Golpe Duplo** (dois ataques rápidos) OU **Rasteira** (atordoa)
- Nv10: **Fumaça** (escape + invisibilidade curta) OU **Provocar** (rouba aggro, útil em grupo — preparação para sistemas cooperativos futuros)

---

## 12. Especializações

Desbloqueadas no **nível 15**, escolha permanente (redefinível apenas com item raro, igual talentos):

| Classe | Especialização A | Especialização B |
|---|---|---|
| Guerreiro | Guardião (tank) | Duelista (dano/contra-ataque) |
| Mateiro | Caçador (dano à distância) | Rastreador (mobilidade/crítico) |
| Encantado | Elementalista (dano elemental puro) | Conjurador (invocações) |
| Benzedeiro | Curador (suporte) | Exorcista (anti-sobrenatural) |
| Alquimista | Boticário (poções/suporte) | Bombardeiro (dano de área) |
| Malandro | Trapaceiro (debuffs/controle) | Lâmina (crítico/velocidade) |

Cada especialização concede um **traço passivo único** (ex.: Guardião — provoca aggro automaticamente ao bloquear; Exorcista — dano dobrado contra a tag "sobrenatural") mais uma habilidade exclusiva de nível 15.

---

## 13. Profissões

Independentes da classe de combate. Nível próprio (1–10 no MVP), XP ganho pela prática da atividade.

1. **Agricultura** — plantar/colher; XP por colheita.
2. **Pesca** — minigame de pesca; XP por captura, bônus por raridade.
3. **Mineração** — minigame de mineração; XP por minério extraído.
4. **Culinária** — cozinhar receitas; XP por prato feito.
5. **Artesanato** — fabricar ferramentas/móveis; XP por item.
6. **Alquimia** — poções/bombas (profissão civil, distinta da classe de combate Alquimista — a classe usa combate, a profissão fabrica em massa fora de combate); XP por poção.
7. **Criação de animais** — cuidar de galinhas/cabras; XP diário por animal feliz.
8. **Coleta** — ervas, madeira, fibras no mundo aberto; XP por coleta.

Cada nível de profissão (a cada 2 níveis) libera receitas/ferramentas melhores (ex.: Pesca nível 4 libera vara que alcança o meio do rio; Mineração nível 6 libera picareta de minério raro).

Builds combinadas incentivadas ativamente: Guerreiro+Agricultor, Encantado+Pescador, Alquimista+Minerador, Mateiro+Criador — todas viáveis sem penalidade cruzada.

---

## 14. Sistema de combate

**Objetivo:** combate tático, curto, legível em tela pequena, sem exigir combos complexos de multitoque.

**Funcionamento:** ação em tempo real, câmera top-down levemente angulada. Movimento livre com joystick virtual; ataque básico direcionado (com leve auto-aim de ~15° para compensar a imprecisão do dedo); esquiva com invencibilidade breve (~0,3s); duas habilidades de classe + habilidade especial (custo de recurso — ST ou MP conforme classe) + item rápido.

**Regras:**
- Combates comuns: 10–30 segundos, 1–4 inimigos.
- Inimigos telegrafam ataques (0,4–0,8s de aviso visual) — combate é sobre leitura e posicionamento, não reflexo puro.
- Sem combate automático: o jogador sempre controla movimento e timing.

**[Decisão de Design — confirmada]** O brief original lista 6 ações simultâneas no lado direito da tela (ataque, esquiva, habilidade 1, habilidade 2, especial, item rápido). Em um botão físico isso é tranquilo; em touchscreen, 6 botões fixos competem por espaço com o polegar e tendem a gerar toques acidentais — problema real em jogos mobile de ação. Solução adotada: **4 botões fixos** (Ataque, Esquiva, Habilidade 1, Habilidade 2) dispostos em leque ao redor do polegar, e Habilidade Especial + Item Rápido movidos para um **botão contextual único** que abre uma roda radial ao ser pressionado e segurado (hold-to-radial, comum em Genshin Impact/Diablo Immortal mobile). Isso preserva as 6 ações sem lotar a tela. Já validado no protótipo jogável (Seção 60-A). Ver Seção 35–36.

**Progressão:** dano/HP escalam com nível e equipamento; inimigos ganham variantes "elite" em áreas avançadas (glow visual + stats +50%).

**Exemplo:** Guerreiro nível 8 enfrenta 2 Javalis Musgosos — esquiva a investida, contra-ataca (talento nv5), finaliza com Golpe Pesado (talento nv5 alternativo se essa build for escolhida) — combate dura ~18s.

**Implementação necessária:** state machine de combate por entidade (Idle/Move/Attack/Hurt/Dead), sistema de hitbox/hurtbox por frame de animação, resource de habilidade com cooldown e custo, camada de input touch com deadzone configurável.

---

## 15. Armas

Por classe, 3 tiers de progressão no MVP (Comum → Incomum → Raro), cada tier com 2–3 variantes visuais/estatísticas:

- **Guerreiro:** Espada (balanceada), Facão (rápida, menos dano), Machado (lenta, alto dano + chance de sangramento), Lança (alcance, boa contra grupos).
- **Mateiro:** Arco Curto (rápido), Arco Longo (dano, lento), Armadilhas (utilidade, não é "arma" de combo).
- **Encantado:** Cajado (dano mágico padrão), Foco Encantado (mais MP, menos dano base).
- **Benzedeiro:** Terço de Combate (cura + dano leve), Patuá (foco em buffs).
- **Alquimista:** Bandoleira de Frascos (define tipo de bomba equipada).
- **Malandro:** Adaga Simples (rápida), Par de Adagas (crítico), Berimbau-Arma (híbrido dano/debuff, item de assinatura cultural).

Armas têm dano base + 0–2 slots de encantamento (aplicados via Alquimia/Artesanato).

---

## 16. Armaduras

Slots: arma, cabeça, torso, pernas, botas, amuleto, anel 1, anel 2.

Sets temáticos por região (não por classe — qualquer classe pode usar qualquer armadura, atributos incentivam escolhas):
- **Set do Sítio** (inicial, craftável): tecido/couro simples, bônus em Agricultura/Pesca.
- **Set da Mata** (Mata do Cedro): couro reforçado, bônus de ESQ.
- **Set da Mina** (Mina Santa Luzia): metal simples, bônus de DEF, penalidade leve de VEL.
- **Set Encantado** (drop pós-boss, raro): peça única por slot, bônus de RES e MP.

---

## 17. Loot

Monstros dropam: materiais de crafting (comum), ingredientes de culinária/alquimia (comum), moedas (sempre), equipamento (raro, 5–10% base), itens de quest (quando aplicável, garantido), itens muito raros (ex.: Fragmento do Encantado — drop único de boss, garantido na primeira derrota).

**Regra anti-inflação de inventário:** monstros comuns nunca dropam equipamento completo aleatório — apenas materiais. Equipamentos vêm de crafting, recompensas de missão ou bosses. Isso evita a "enxurrada de lixo" citada no brief.

---

## 18. Crafting

Categorias: Ferramentas, Armas, Armaduras, Comida, Poções, Construções, Decorações, Itens mágicos.

Estações: Bancada de Trabalho (ferramentas/armas simples, disponível desde o início), Fogão (culinária), Bancada de Alquimia (poções/bombas, desbloqueada por quest curta no Ato 1), Bigorna (armas/armaduras de metal, na oficina da vila — serviço do ferreiro NPC até o jogador desbloquear a própria).

Receitas descobertas via: NPCs (ensinam ao atingir nível de amizade), exploração (livros/pergaminhos encontrados), quests, experimentação (combinar ingredientes desconhecidos tem chance de "descobrir" receita simples — sistema opcional de baixo custo de implementação).

---

## 19. Agricultura

Terreno do sítio inicial: 6x6 tiles aráveis (expansível). Ciclo: preparar solo → plantar semente → regar diariamente → colher ao atingir dias de maturação.

Culturas do MVP (adaptadas ao clima local, Seção 33): mandioca (staple, resistente), milho, abóbora, feijão, ervas medicinais (ligadas a Alquimia). Cada cultura tem estação preferida — plantar fora da estação reduz rendimento em 50%, não impede.

---

## 20. Pesca

Minigame simples de timing: barra de tensão, o jogador toca no momento certo para "puxar" sem estourar a linha. Peixes variam por região (Rio das Pedras), horário e clima (peixe raro só aparece sob chuva, por exemplo). Vara melhora com nível de profissão (alcance, chance de raro, redução de tempo de espera).

---

## 21. Mineração

Minigame de "golpes com timing": o jogador martela veios de minério na Mina Santa Luzia, com indicador de dureza da rocha. Picareta melhor reduz golpes necessários. Minérios comuns cedo (cobre, ferro), minério "encantado" raro liberado após o boss.

---

## 22. Casa e construção

Tiers: Casa nível 1 (inicial, 1 cômodo) → nível 2 (quarto extra + baú maior) → nível 3 (sótão + espaço de decoração ampliado). Construções externas desbloqueáveis: Oficina, Estufa, Estábulo, Galinheiro (estábulo/galinheiro fora do MVP jogável mas com fundação já preparada no terreno — teaser). Decoração livre com sistema de grid + rotação, sem restrição de "gosto" — só limite de posições válidas.

---

## 23. Economia

**[Decisão de Design — confirmada]** O brief sugere "Réis" com ressalva sobre conflito histórico. Optamos por moeda fictícia: **Vintém** (plural **vinténs**) — nome real de moeda histórica brasileira em desuso, então soa autêntico sem representar a moeda nacional atual nem gerar expectativa de conversão real. Já implementada no protótipo jogável (Seção 60-A) com ícone de moeda dourada no HUD.

Fontes de renda: agricultura, pesca, mineração, quests, artesanato, culinária, exploração (baús). Nenhuma fonte única domina: preços de venda são calibrados para que a melhor estratégia seja combinar 2–3 atividades, não farmar uma só (ex.: peixe raro vende bem mas é limitado por clima/horário; minério é constante mas de menor valor unitário).

---

## 24. 12 NPCs completos

**1. Seu Osvaldo** — 58 anos, minerador. Rabugento por fora, leal por dentro. Rotina: mina de manhã, boteco à noite. Gosta de café forte; odeia desperdício. Rixa com Dona Micaela (discordam sobre "mexer com coisas antigas"). Segredo: perdeu o irmão na Mina Santa Luzia anos atrás, nunca contou o motivo real. Quest pessoal: ajudar a recuperar uma ferramenta do irmão perdida na mina. Papel na história: guia o jogador na primeira entrada da mina.

**2. Dona Micaela** — 74 anos, benzedeira/anciã. Sábia, enigmática, fala por metáforas. Rotina: capela de manhã, quintal à tarde. Gosta de ervas raras; odeia mentira. Amiga de longa data da mãe do jogador (implícito). Segredo: já viu um Veio do Encantado se abrir antes, décadas atrás. Quest pessoal: coletar 3 ervas específicas para uma bênção. Papel: reconhece o Fragmento do Encantado no final do MVP.

**3. Cauã** — 16 anos, ajudante de pescador. Curioso, fala rápido, quer aventura. Rotina: rio de manhã, praça à tarde. Gosta de histórias de assombração; odeia ser tratado como criança. Rixa com ninguém, mas rivalidade amigável com Iara (quem pesca mais). Segredo: já viu uma luz estranha no rio e tem medo de contar. Quest pessoal: acompanhar o jogador numa pescaria noturna. Papel: gatilho de uma quest de investigação (Seção 30).

**4. Iara (a pescadora, sem relação com a entidade mitológica)** — 29 anos, pescadora profissional. Competitiva, direta, gentil quando confia em alguém. Rotina: rio o dia todo. Gosta de desafios; odeia gente que suja o rio. Rixa amigável com Cauã. Segredo: nenhum — é exatamente quem parece ser (contraste proposital com o mistério ao redor). Quest pessoal: torneio informal de pesca. Papel: professora de pesca avançada.

**5. Zeca do Boteco** — 45 anos, dono do boteco. Caloroso, fofoqueiro sem malícia, cozinha bem. Rotina: boteco o dia todo. Gosta de música; odeia briga dentro do estabelecimento. Amigo de todos. Segredo: sabe de quase todos os segredos da vila e guarda todos. Quest pessoal: recuperar uma receita de família perdida. Papel: hub de rumores/fofocas (gameplay: fonte de pistas de quest).

**6. Padre Anselmo** — 61 anos, cuida da capela. Gentil, cético em público, mais aberto em particular. Rotina: capela. Gosta de silêncio; odeia superstição usada pra explorar os outros. Tensão sutil com Dona Micaela (fé institucional x tradição popular — nunca hostil, só distinta). Segredo: registra em um caderno relatos "estranhos" da vila há anos. Quest pessoal: encontrar página arrancada do caderno. Papel: lore dump opcional profundo.

**7. Marisa** — 34 anos, dona do mercadinho. Prática, maternal, workaholic. Rotina: mercadinho o dia todo. Gosta de organização; odeia gente enrolando na fila. Cunhada de Zeca. Segredo: está endividada tentando expandir o mercado. Quest pessoal: entregar suprimentos atrasados (ligeira pressão de tempo). Papel: comércio principal da vila.

**8. Tunico** — 40 anos, ferreiro/artesão. Calado, perfeccionista, orgulhoso do ofício. Rotina: oficina. Gosta de metais raros; odeia trabalho malfeito. Rival profissional (saudável) de um ferreiro de outra vila, nunca visto (hook de expansão). Segredo: está perdendo a visão aos poucos e não conta a ninguém. Quest pessoal: buscar um material especial que ele não enxerga bem para separar. Papel: crafting de armas/armaduras metálicas.

**9. Deca** — 23 anos, agricultora vizinha. Animada, testando técnicas novas, um pouco cabeça no ar. Rotina: campo dela, de manhã até o fim da tarde. Gosta de experimentar plantios; odeia terra desperdiçada. Amiga próxima em potencial do jogador (melhor candidata a "primeira amizade forte"). Segredo: nenhum grande — genuína, serve de contraste emocional "seguro" perto do mistério crescente. Quest pessoal: testar uma semente nova e arriscada. Papel: professora de Agricultura.

**10. Vô Benedito** — 80 anos, contador de causos aposentado. Engraçado, teatral, adorado por crianças. Rotina: praça, banco embaixo do ipê. Gosta de plateia; odeia ser interrompido no meio de uma história. Melhor amigo de longa data de Seu Osvaldo (apesar das rixas de Osvaldo com outros). Segredo: metade dos "causos" que conta são reais, ele só finge que são invenção. Quest pessoal: nenhuma formal — função é lore ambiental e pistas disfarçadas de folclore. Papel: entrega lore do Encantado em doses digeríveis, sem exposição forçada.

**11. Iolanda** — 27 anos, curandeira/parteira da vila, rival amistosa de Dona Micaela quanto a métodos (ciência caseira x tradição espiritual). Gosta de resultado prático; odeia gente que recusa ajuda por orgulho. Segredo: aprendeu escondido com Dona Micaela quando nova, apesar da rivalidade pública. Quest pessoal: reconciliar-se abertamente com Micaela. Papel: professora de Alquimia/poções básicas.

**12. Batista** — 50 anos, guarda informal da vila / ex-caçador. Sério, protetor, desconfiado de forasteiros no início (inclusive do jogador). Rotina: patrulha a Estrada Velha. Gosta de disciplina; odeia imprudência que põe outros em risco. Rixa velada com Seu Osvaldo (discordam sobre lidar com a mina). Segredo: foi ele quem lacrou a entrada mais profunda da mina anos atrás, e sabe por quê. Quest pessoal: provar ao jogador que é confiável escoltando-o numa exploração inicial. Papel: professor de combate básico no tutorial; guardião narrativo de acesso a áreas avançadas.

---

## 25. Sistema de amizade

Escala de 0 a 10 corações por NPC. Ganho por: diálogos diários (+pequeno, com cooldown de 1x/dia por NPC), presentes (bônus se for algo que o NPC gosta, penalidade se for algo que odeia), completar quests pessoais (+grande, marco fixo). Marcos em 2/5/8/10 corações desbloqueiam: novas linhas de diálogo, receitas exclusivas, cenas de "evento de coração" (curta cutscene), e no marco 10, uma recompensa única (item ou benefício de gameplay ligado à profissão do NPC).

---

## 26. Sistema de relacionamentos

Subconjunto de NPCs elegíveis para relacionamento romântico mais profundo no MVP: **Cauã*** (ajustado para maior de idade em versão final — ver nota), **Iara**, **Deca**, **Iolanda** (dois candidatos por gênero/orientação, sem restrição binária de gênero do jogador). Amizade acima de 8 corações com um candidato elegível libera uma cena de "confissão" opcional; aceitar move o relacionamento para status "Namorando", que altera diálogos, adiciona interações exclusivas (presentear com frequência maior, abraços/animações especiais) mas **não** altera stats de combate — romance é puramente social/narrativo no MVP, para não forçar otimização.

*Nota de produção: a idade de Cauã (16) o torna inadequado como candidato romântico; ele permanece como amizade não-romântica. Lista de candidatos românticos revisada para adultos: Iara, Deca, Iolanda, e um quarto candidato a definir na produção plena (fora do MVP mínimo, que pode lançar com 2–3 candidatos apenas).

---

## 27. 15 inimigos iniciais

Os 9 do brief original + 6 adicionais para completar a lista, todos de baixo/médio nível (Mata do Cedro e Mina Santa Luzia):

1. **Rato-do-Mato Corrompido** — trivial, ataque de mordida.
2. **Javali Musgoso** — investida direta, precisa de esquiva lateral.
3. **Vagalume Encantado** — voa, ataque mágico à distância fraco.
4. **Cipó Vivo** — estacionário, prende o jogador (quebra com botão de mash ou dano).
5. **Sapo de Pedra** — alta DEF, baixo dano, testa paciência/posicionamento.
6. **Morcego de Mina** — rápido, ataques em rajada, baixo HP.
7. **Carniçal da Estrada** — noturno, agressivo, dano médio-alto.
8. **Assombração** — resistente a dano físico, fraca a dano espiritual/mágico (ensina o jogador sobre RES/tipos de dano).
9. **Mula-sem-Cabeça** — rara, evento especial, alto risco/recompensa.
10. **Formiga-Gigante da Mina** — em grupo, fracas individualmente, perigosas em enxame (ensina controle de área).
11. **Coró Rastejante** — larva gigante subterrânea, emerge do chão com aviso sonoro (ensina leitura de telegraph).
12. **Pé-de-Garrafa Bêbado** *(entidade cômica menor do folclore local inventado)* — erra ataques com frequência, mas se acerta aplica Lentidão; alívio cômico no meio da mina.
13. **Raiz Rastejante** — inimigo-planta ligado à corrupção (drops material de quest, conecta visualmente ao boss).
14. **Peixe-Serra do Rio** — único inimigo aquático do MVP, aparece ao pescar em pontos "perigosos" do Rio das Pedras.
15. **Sombra do Minerador** — inimigo espiritual da câmara profunda da mina, imediatamente antes do boss (mini-boss/elite, HP alto, único).

Curupira e Boitatá **não** estão nesta lista — são entidades neutras/narrativas (Seção 5), não inimigos de combate padrão no MVP.

---

## 28. Primeiro boss: Carcará de Ferro

**Objetivo:** clímax do MVP, ensina leitura de fases e telegraphs em escala maior, entrega a virada narrativa (vítima, não vilão).

**Stats de referência (jogador nível ~10):** HP 1800, 3 fases por limiar de HP (100–60%, 60–25%, 25–0%).

**Fase 1 (100–60%):**
- *Bicada* — ataque frontal, telegraph 0,6s, dano médio.
- *Rasante* — cruza a arena em linha reta, alto dano se atingido, fácil de esquivar lateralmente.
- *Rajada de Penas* — 5 projéteis em leque, exige movimento lateral constante.

**Fase 2 (60–25%) — arena parcialmente destruída (visual muda, reduz área útil em ~20%):**
- *Grito do Carcará* — aplica Medo em área (bloqueia habilidade especial por alguns segundos); jogador deve sair do raio visível no chão.
- *Queda de Pedra* — marcadores no chão avisam onde cai destroço; punição por ficar parado.
- *Ninho Corrompido* — invoca 2 Morcegos de Mina; jogador deve gerenciar adds sem ignorar o boss por completo.

**Fase 3 (25–0%):**
- Todos os ataques anteriores ficam ~20% mais rápidos.
- *Fúria da Raiz* (novo): as raízes tomam o controle por breves picos — olhos mudam de laranja para preto, boss ganha um ataque telegrafado maior porém com janela de punição clara (recompensa jogadores que aprenderam o padrão).

**Resolução:** ao zerar o HP, cutscene curta: as raízes negras se rompem, o Carcará recupera brevemente os olhos alaranjados normais, emite um som "humano" de dor/alívio, e se desfaz em partículas, deixando o **Fragmento do Encantado**. Sem loot de combate genérico nesse encontro — é 100% narrativo.

**Implementação necessária:** state machine de fases com gatilho por % de HP, sistema de telegraph reutilizável (decal de aviso no chão + timer), spawner de adds controlado, troca de geometria de arena (fase 2) via toggle de colliders.

---

## 29. Dungeon da Mina Santa Luzia

Estrutura curta e linear com dois desvios opcionais (baús secundários), pensada para 20–35 minutos de exploração + boss.

1. **Entrada** — tutorial de picareta simples, primeiro Morcego de Mina.
2. **Galeria dos Trilhos** — puzzle leve: empurrar vagonete para formar ponte sobre buraco.
3. **Câmara das Formigas** — sala de combate em arena (enxame, ensina controle de área).
4. **Desvio A (opcional):** bolsão de minério raro guardado por 1 Sapo de Pedra elite.
5. **Passagem das Raízes** — primeiras raízes negras visíveis nas paredes; tom muda (áudio/iluminação).
6. **Desvio B (opcional):** sala com Sombra do Minerador (mini-boss) guardando baú com receita de crafting rara.
7. **Câmara Funda** — sala do Despertar (se ainda não ocorreu) ou diretamente arena do boss.
8. **Arena do Carcará de Ferro.**

Checkpoints de save automático antes do boss (ver Seção 38).

---

## 30. 20 quests iniciais

Classificadas para proteger o escopo do MVP: **8 principais** (avançam a trama), **12 secundárias/comunitárias** (aprofundam mundo e amizade). Todas cabem dentro das 3–5h de conteúdo.

**Principais:**
1. Reforma da casa (tutorial).
2. Primeiro contato com a vila (apresenta 6 NPCs-chave).
3. Rumores da Mina (Seu Osvaldo pede ajuda).
4. O Despertar (evento de escolha de classe).
5. Investigação das Raízes (explorar até a Passagem das Raízes).
6. A Câmara Funda (chegar à arena do boss).
7. O Carcará de Ferro (boss fight).
8. O Fragmento (levar o item a Dona Micaela — epílogo/gancho).

**Secundárias/comunitárias:**
9. A ferramenta perdida de Osvaldo.
10. As três ervas de Dona Micaela.
11. Pescaria noturna com Cauã (luzes no rio — exemplo do brief, ver formato de escolha abaixo).
12. Torneio informal de pesca com Iara.
13. A receita de família de Zeca.
14. A página arrancada do caderno do Padre Anselmo.
15. Suprimentos atrasados de Marisa.
16. O material que Tunico não enxerga.
17. A semente arriscada de Deca.
18. Os causos verdadeiros de Vô Benedito (3 partes, entrega lore).
19. A reconciliação de Iolanda e Micaela.
20. A patrulha de confiança com Batista.

**Exemplo de missão com ramificação (quest 11, conforme brief):** Cauã relata luzes no rio por três noites seguidas. O jogador visita o Rio das Pedras entre 00:00–02:00. Uma entidade aquática menor aparece (não hostil por padrão). Opções: **Atacar** (combate, entidade foge e não retorna — fecha a quest com recompensa mínima e reputação neutra), **Conversar** (testa CAR/ESP, sucesso revela pista sobre os Veios), **Seguir** (leva a uma área extra pequena, recompensa de exploração), **Oferecer item** (se o jogador tiver um item específico de pesca/comida no inventário, a entidade "aceita" e vira fonte de uma receita rara — melhor final da quest). Este padrão de 4 abordagens é o template para todas as quests de "investigação" do jogo.

---

## 31. Eventos aleatórios

Baixa frequência, curados (não puramente randômicos, para manter qualidade): comerciante viajante na Estrada Velha (estoque único, 1x a cada poucos dias), tempestade repentina (afeta pesca/agricultura por um dia), avistamento raro de Mula-sem-Cabeça (evento noturno especial, opcional, alto risco), NPC pede ajuda pontual fora de sua rotina normal (pequena variação de diálogo, sem quest formal), luzes na mata visíveis à distância à noite (puramente atmosférico, reforça mistério sem exigir ação).

---

## 32. Dia/noite

Ciclo de 24 min reais = 24h no jogo (1 min real ≈ 1h jogo), ajustável em configurações para sessões mais curtas. Fases: Manhã (6h–12h, foco em agricultura/comércio), Tarde (12h–18h, exploração), Noite (18h–00h, criaturas noturnas substituem as diurnas em algumas áreas), Madrugada (00h–6h, eventos sobrenaturais raros, a maioria dos NPCs dorme).

---

## 33. Clima

Sistema simples de estados: Seco, Chuvoso, Tempestade (raro), Neblina (raro, associado a áreas sobrenaturais). Sem neve — clima segue lógica de regiões tropicais/subtropicais brasileiras, conforme o brief pede. Certas plantações rendem mais na chuva; certos peixes só aparecem sob chuva; neblina aumenta chance de encontros sobrenaturais raros (ex.: Mula-sem-Cabeça).

---

## 34. Sistema de Perturbação da Mata

**Objetivo:** dar peso ecológico às ações do jogador sem virar mecânica punitiva visível/microgerenciada.

**Funcionamento:** contador oculto por região (ex.: Mata do Cedro), incrementado por ações agressivas em excesso (cortar muitas árvores em pouco tempo, matar fauna não-hostil, ignorar avisos de NPCs), decrementado por replantio, completar quests de proteção, ou tempo sem atividade destrutiva.

**Regras:** acima de certos limiares, a região fica **mais perigosa** (inimigos com stats levemente maiores, mais spawns noturnos) e pode acionar a atenção do **Curupira** — que no MVP aparece como um evento de aviso não-letal (ex.: rastros trocados que atrapalham a navegação por alguns minutos) antes de qualquer punição mais séria, reforçando que ele "protege", não "ataca sem motivo".

**Progressão:** o contador é invisível na UI (por design, conforme o brief pede "parcialmente escondido") — o jogador percebe por mudanças ambientais e comentários de NPCs, não por uma barra.

**Exemplo:** jogador corta 15 árvores em uma sessão sem replantar nada → na sessão seguinte, Javalis Musgosos na Mata do Cedro spawnam com frequência maior e um NPC comenta "a mata anda esquisita ultimamente".

**Implementação necessária:** variável persistente por região no save, hooks em ações de coleta/combate que a incrementam, checagem de limiares que ajusta tabelas de spawn e desbloqueia flags de diálogo.

---

## 35. Interface mobile

Poucos menus, textos grandes, ícones claros. Telas principais: HUD de exploração (minimapa canto superior, barra HP/ST/MP canto inferior esquerdo, relógio+clima canto superior direito), Inventário (grid, abas por categoria), Mapa (tela cheia, toque para viagem rápida em pontos já visitados), Diário de Missões (lista simples, missão ativa fixada no topo do HUD como objetivo curto), Ficha de Personagem (atributos, classe, talentos), Relacionamentos (lista de NPCs com corações).

Distinção visual entre "Encantado" (mundo) e "Encantado" (classe, Seção 10): a classe usa ícone de mão com faísca roxa; referências ao plano sobrenatural usam ícone de espiral verde-escura — paletas de cor diferentes em toda UI e diálogo relacionado.

---

## 36. Controles touchscreen

Lado esquerdo: joystick virtual flutuante (aparece onde o polegar toca).
Lado direito: 4 botões fixos em leque (Ataque, Esquiva, Habilidade 1, Habilidade 2) + 1 botão contextual central maior que, ao ser **pressionado e segurado**, abre roda radial com Habilidade Especial e até 3 itens rápidos (ver Seção 14 para a justificativa da mudança de 6 para 4+1 botões). Toque simples no botão contextual usa o último item selecionado na roda (evita necessidade de abrir a roda toda vez).

Fora de combate: toque simples interage com NPCs/objetos; toque longo abre menu de contexto (examinar, falar, presentear) quando há ambiguidade.

---

## 37. Inventário

Grid de 30 slots iniciais (expansível via upgrade de casa/mochila), com sistema de peso leve (baseado em FOR) apenas para itens de mineração/coleta em excesso — não para o dia a dia geral, para não frustrar o jogador casual. Empilhamento até 99 por item para materiais; equipamentos não empilham. Abas: Equipamento, Materiais, Consumíveis, Quest (itens de missão nunca ocupam peso e não podem ser vendidos acidentalmente).

---

## 38. Save system

Autosave ao dormir (fim de dia), ao entrar/sair de interiores, e em checkpoints fixos de dungeon (antes do boss, Seção 29). Slot único por perfil no MVP (simplicidade); salva local em arquivo estruturado (Seção 55) — **sem exigir infraestrutura de nuvem no MVP**, que fica para uma fase pós-lançamento junto de contas de usuário.

---

## 39. Tutorial dos primeiros 30 minutos

0–3 min: cutscene de chegada + criação/customização leve de personagem.
3–8 min: movimentação, interação, primeira conversa com Batista (apresenta combate básico contra Rato-do-Mato Corrompido no quintal).
8–15 min: reforma simples da casa (primeira quest, ensina crafting básico na Bancada de Trabalho).
15–22 min: primeira volta pela Vila do Ipê, apresenta 4–5 NPCs centrais, ensina diálogo/amizade.
22–28 min: primeira tarefa de profissão (plantar a primeira leira de mandioca com Deca).
28–30 min: gancho de missão — Seu Osvaldo menciona animais sumindo perto da mina, fecha a sessão tutorial com objetivo claro para a próxima.

---

## 40. Progressão das primeiras 5 horas

- **0–0h30:** tutorial (Seção 39).
- **0h30–1h30:** rotina da vila, 3–4 quests secundárias, primeiro nível de profissão em pelo menos uma atividade, primeira visita à Mina Santa Luzia (níveis 1–3 de personagem).
- **~1h:** O Despertar — escolha de classe.
- **1h30–3h:** progresso pela dungeon, combates de aprendizado, nível ~8–10, primeira especialização ainda não (chega só no 15).
- **3h:** boss Carcará de Ferro.
- **3h–4h30:** epílogo narrativo (entrega do Fragmento, cena com Dona Micaela), limpeza de quests secundárias pendentes, exploração livre do que já foi desbloqueado.
- **4h30–5h:** jogador livre para focar em profissões/relacionamentos, com o gancho da revelação maior estabelecido para conteúdo futuro.

---

## 41. MVP técnico

Escopo fechado, conforme Seção 26 do brief: 1 vila, 1 sítio, 1 floresta, 1 rio, 1 dungeon com 1 boss, 6 classes (sem necessidade de implementar as 12 especializações completas — apenas a escolha e o traço passivo básico, já que nível 15 raramente é alcançado em 3–5h, mas o sistema deve existir para não travar jogadores que grindam), 8 profissões (níveis 1–10), 10–15 inimigos, 12 NPCs completos, agricultura, pesca, mineração, crafting básico, combate em tempo real, sistema de nível 1–30, ~20 quests, dia/noite, clima básico (Seco/Chuvoso), Perturbação da Mata (versão simples, 1 região só: Mata do Cedro).

---

## 42. Sistemas que devem ficar fora do MVP

Multiplayer/cooperativo, romance com mais de 4 candidatos, estábulo/galinheiro jogável (só teaser visual), Ruínas do Engenho e Brejo das Lanternas jogáveis, Serra da Onça, save em nuvem/contas, monetização com loja, sistema de clima avançado (neblina/tempestade com efeitos mecânicos profundos), especializações totalmente aprofundadas (nível 20+), NPCs além dos 12 centrais, crafting de decoração avançado, qualquer conteúdo de regiões futuras fora do Vale do Ipê.

---

## 43. Roadmap de desenvolvimento

**Fase 0 — Pré-produção (4–6 semanas):** protótipo de movimentação + combate (grayboxing), validação de controles touch, escolha final de pipeline de arte.

**Fase 1 — Core sistemas (8–10 semanas):** atributos, combate, inventário, save, diálogo, 1 classe completa (Guerreiro) como referência.

**Fase 2 — Conteúdo vertical slice (8–10 semanas):** Vila do Ipê + Sítio completos, 4–6 NPCs, agricultura/pesca/mineração básicas, 6 classes implementadas (sistema genérico de habilidades, não só Guerreiro).

**Fase 3 — Dungeon e boss (6–8 semanas):** Mina Santa Luzia completa, Carcará de Ferro, sistema de fases de boss.

**Fase 4 — Conteúdo restante (6–8 semanas):** 12 NPCs completos, 20 quests, Perturbação da Mata, clima, polish de UI mobile.

**Fase 5 — Otimização e QA (4–6 semanas):** performance Android, testes de dispositivo, balanceamento final.

Total estimado: ~9–11 meses para equipe pequena (4–8 pessoas) até MVP jogável publicável.

---

## 44. Sugestão de engine: Godot vs Unity

**Recomendação: Godot 4.x.**

Justificativa técnica:
- Projeto é 2D puro (pixel art top-down) — o pipeline 2D nativo da Godot (nós `Node2D`, `TileMap`, `AnimatedSprite2D`) é mais direto que o pipeline 2D da Unity, historicamente construído sobre uma base 3D.
- Licença GPL/MIT sem royalties nem taxas por instalação — relevante para equipe pequena/indie com orçamento limitado, evita o histórico de mudanças de política de cobrança que a Unity já teve.
- Tamanho de build/engine menor, exportação para Android mais leve, importante para "carregamento rápido" e "economia de bateria" (Seção 24 do brief).
- GDScript tem curva de aprendizado baixa para prototipagem rápida de sistemas de gameplay (diálogo, quests, inventário) — produtividade alta para times pequenos sem programadores C++/C# sêniors dedicados.
- Contras a monitorar: ecossistema de assets/plugins de terceiros menor que Unity; para jogos 2D isso é menos crítico que seria para 3D. Editor de animação e tilemap da Godot 4 já é maduro o suficiente para o escopo deste projeto.

Unity seria preferível apenas se houvesse pretensão de 3D pesado, grande dependência de assets de loja prontos, ou equipe já especializada em C#/Unity — não é o caso aqui.

---

## 45. Estrutura de dados necessária

Recursos principais (como `Resource` do Godot, serializáveis):

- `ItemData` (id, nome, descrição, ícone, tipo, raridade, peso, empilhável, efeitos)
- `WeaponData` (extends ItemData: dano base, tipo de dano, slots de encantamento, classe requerida)
- `ArmorData` (extends ItemData: slot, defesa, resistência, bônus de atributo)
- `AbilityData` (id, nome, custo, cooldown, dano/efeito, animação associada, classe/nível requerido)
- `CharacterClassData` (id, atributo principal, lista de `AbilityData` por nível, especializações)
- `NPCData` (id, nome, rotina [lista de pontos+horário], diálogo raiz, nível de amizade, quests associadas)
- `QuestData` (id, etapas, condições de progresso, recompensas, ramificações)
- `EnemyData` (id, stats, tabela de loot, padrões de ataque, tags como "sobrenatural")
- `CropData` (id, dias de maturação, estação, rendimento, requisitos de clima)
- `SaveGameData` (estado do jogador, inventário, flags de quest, amizades, perturbação por região, hora/dia/clima atual)

---

## 46. Arquitetura básica do código

Autoloads/singletons (Godot): `GameState` (dados globais de save/hora/clima), `EventBus` (sinais globais desacoplados entre sistemas — combate, quests, UI), `DialogueManager`, `QuestManager`, `InventoryManager`.

Padrão geral: composição via nós filhos + `Resource` para dados, sinais (`Signal`) para comunicação entre sistemas em vez de referências diretas acopladas (ex.: inimigo morre → emite sinal → `QuestManager` e `LootManager` escutam, sem o inimigo precisar conhecer nenhum dos dois). Máquinas de estado (`StateMachine` genérica reutilizável) para: personagem do jogador, inimigos, bosses, NPCs (rotina diária).

---

## 47. Organização de cenas/mapas

Uma cena por região externa (`vila_ipe.tscn`, `sitio.tscn`, `mata_cedro.tscn`, `rio_pedras.tscn`, `estrada_velha.tscn`), carregadas sob demanda com transição suave nas bordas (não é open world contíguo em uma única cena — é um conjunto de cenas conectadas por portais/bordas, mais leve para mobile). Interiores (casas, mina) como cenas separadas, instanciadas ao entrar, descarregadas ao sair (economiza memória). Dungeon da mina como cena única com sub-seções controladas por marcadores de checkpoint.

---

## 48. Sistema de diálogos

Estrutura em árvore JSON/Resource simples: nós de texto com falante, retrato, e lista de escolhas (cada escolha aponta para o próximo nó ou fecha o diálogo). Condições em nós/escolhas (`amizade >= X`, `quest_flag == Y`, `atributo >= Z` para escolhas de CAR/ESP como citado no brief). Efeitos disparados por nó (adicionar item, mudar amizade, avançar quest). Ferramenta de autoria recomendada: editor simples in-engine ou formato `.json` editável externamente — evita depender de plugin de terceiros custoso para uma equipe pequena, mas um plugin dedicado (ex.: Dialogic para Godot) é aceitável para acelerar produção se o orçamento permitir.

---

## 49. Sistema de quests (técnico)

Cada `QuestData` é uma máquina de estados própria: `NaoIniciada → EmAndamento(etapa_atual) → Concluida/Falhou`. Etapas guardam condição de progresso (matar X, coletar Y, chegar em Z, falar com W, escolha de diálogo específica) e são avaliadas por eventos do `EventBus`. `QuestManager` mantém lista de quests ativas, atualiza HUD (objetivo fixado) e persiste estado no save. Ramificações (Seção 30) são apenas etapas alternativas dentro da mesma quest, não quests separadas — mantém o rastreamento simples.

---

## 50. Sistema de combate (técnico)

Ver Seção 14/51/52. Núcleo: componente `CombatController` por entidade com `HealthComponent`, `HitboxComponent`/`HurtboxComponent` (via `Area2D`), `StatusEffectController` (fila de efeitos ativos com duração), e `AbilityController` que resolve custo/cooldown antes de instanciar o efeito (projétil, área, melee hitbox temporária). Input do jogador mapeado para os mesmos métodos que a IA chama para inimigos — garante paridade de regras (o que vale pro jogador vale pro inimigo).

---

## 51. Sistema de IA dos inimigos

Máquina de estados simples por inimigo: `Patrulha → Alerta → Perseguição → Ataque → Recuo/Fuga (se HP baixo, para alguns tipos) → Morte`. Padrões de ataque como recursos configuráveis (lista de `AbilityData` com peso de escolha e range de uso), reaproveitando o mesmo `AbilityController` do jogador (Seção 50). Detecção via `Area2D` de visão + memória curta (persegue por N segundos após perder linha de visão, depois volta a patrulhar). Sem pathfinding complexo necessário no MVP — mapas pequenos permitem `NavigationAgent2D` padrão da engine sem customização pesada.

---

## 52. Sistema de bosses (técnico)

Extensão do sistema de IA: `BossController` com lista de fases (`BossPhaseData`: limiar de HP, lista de ataques disponíveis, eventos de transição — ex.: destruir parte da arena, tocar nova música). Transição de fase dispara sinal (`EventBus.boss_phase_changed`) que aciona: mudança de música, mudança de colliders de arena, spawn de adds. Telegraphs implementados como componente reutilizável (`TelegraphIndicator`: desenha área de aviso no chão por X segundos antes do dano real ser aplicado) — reutilizável também por inimigos comuns fortes, não exclusivo de boss.

---

## 53. Sistema de itens

`InventoryManager` como grid lógico (array de slots) + `ItemData` como fonte de verdade de cada item. Ações de item (usar, equipar, descartar, presentear) resolvidas por método virtual no próprio `ItemData`/subclasses (`ConsumableData.use()`, `WeaponData.equip()`), evitando um `switch` gigante central. Loot resolvido por `LootTableData` (lista de entradas com peso de drop) associada a cada `EnemyData`.

---

## 54. Sistema de classes e habilidades

`CharacterClassData` guarda: atributo principal, lista de `AbilityData` desbloqueadas por nível (incluindo as duas opções de talento em níveis 5/10/15/20/25/30), e referência às duas `SpecializationData` (nível 15). O personagem do jogador guarda apenas **ids** de habilidades escolhidas (não duplica dados), resolvidos em runtime contra o recurso da classe — troca de build (via redefinição de talento) é apenas trocar esses ids salvos.

---

## 55. Sistema de persistência

Save em arquivo único por perfil (formato JSON legível para facilitar debug, ou `.tres`/binário da própria Godot para produção — recomenda-se JSON durante desenvolvimento, binário comprimido no lançamento). Estrutura principal: `player` (stats, classe, talentos, posição), `inventory`, `quests` (estado de cada uma), `npc_friendship` (mapa id→pontos), `world_state` (perturbação por região, flags de eventos, hora/dia/clima), `unlocks` (receitas, áreas). Autosave conforme Seção 38, mais save manual opcional em menu de pausa.

---

## 56. Estratégia de otimização para Android

Atlas de texturas único por região (reduz draw calls), `TileMap` com culling automático fora de tela, object pooling para projéteis/partículas/inimigos comuns (evita alocação/GC em runtime), limitar partículas simultâneas com orçamento fixo por cena, LOD simples de animação (inimigos fora da tela pausam animação), áudio comprimido (Ogg Vorbis), opção explícita de 30/60 FPS e "modo economia de bateria" que reduz partículas/efeitos de pós-processamento (conforme brief, Seção 24).

---

## 57. Resoluções e proporções de tela suportadas

Design base em resolução virtual **1280x720** (16:9) com escalonamento e **safe area** dinâmica para telas mais alongadas (19.5:9, 20:9, notch/ilha dinâmica) — HUD nunca posicionado nos 5% extremos superior/inferior da tela para não colidir com câmera frontal/gestos do sistema. UI ancorada por margens relativas (não pixels fixos), testada nos extremos 4:3 (tablets) até 20:9 (celulares modernos).

---

## 58. Direção de arte

Pixel art 2D, tile base de **16x16** (personagens em 32x48 para leitura clara em tela pequena), paleta quente e saturada porém não infantilizada (verdes profundos da mata, terracota das construções, dourado do ipê florido como cor de assinatura visual do jogo). Iluminação dinâmica simples (day/night tint + luzes pontuais de tocha/vagalume). Personagens com 4 direções de movimento (não 8, para economizar produção de animação sem perder legibilidade). Arquitetura mistura casas de taipa/alvenaria simples, praça com coreto, capela colonial modesta — nunca estereotipada, sempre funcional dentro da ficção.

---

## 59. Direção sonora

Trilha instrumental com base em violão, viola caipira, percussão leve e sopros discretos para o cotidiano da vila (tom acolhedor); muda para cordas tensas e percussão mais grave/reverb em áreas sobrenaturais (Mina profunda, Brejo). Música adaptativa por camadas (camada "dia a dia" cross-fade para camada "tensão" ao entrar em combate ou perto de raízes negras). SFX localizado (passos diferentes por terreno: terra, grama, pedra, água), ambiência viva (grilos à noite, pássaros de dia, água do rio). Boss com tema próprio de 3 seções (uma por fase), mixagem que prioriza clareza de telegraphs sonoros de ataque sobre a música.

---

## 60. Próximos passos para transformar o conceito em um protótipo jogável

1. Configurar projeto Godot 4.x com estrutura de pastas por sistema (`/scenes`, `/scripts`, `/resources/items`, `/resources/enemies`, `/resources/dialogue`, `/autoload`).
2. Implementar movimentação do jogador + câmera + joystick virtual (Seção 36) em uma cena de teste vazia.
3. Implementar `CombatController` genérico (Seção 50) e validar com 1 inimigo simples (Rato-do-Mato Corrompido) e 1 arma (Espada do Guerreiro).
4. Implementar `InventoryManager` + `ItemData` básicos, validar coleta/uso de 3–4 itens de teste.
5. Construir a cena do Sítio + sistema de agricultura mínimo (plantar/regar/colher 1 cultura).
6. Implementar `DialogueManager` + 1 NPC completo (Seu Osvaldo) como referência de padrão para os outros 11.
7. Implementar `QuestManager` com a quest "Rumores da Mina" ponta a ponta.
8. Prototipar a Mina Santa Luzia (greybox) com o `BossController` e o Carcará de Ferro em versão simplificada (1 fase) para validar a diversão do combate central antes de investir em arte final.
9. Rodar o vertical slice resultante (chegada → tutorial → 1 NPC → mina → boss simplificado) com playtesters externos em dispositivo Android real, medindo especificamente: clareza dos controles touch, legibilidade dos telegraphs, ritmo de sessão de 15–20 minutos.
10. Só então iniciar produção de arte final e conteúdo completo (Fases 2–4 do roadmap, Seção 43), guiada pelos aprendizados do protótipo.

---

## 60-A. Protótipo jogável (implementado, v2)

Antes mesmo do projeto Godot descrito acima, foi construído um **protótipo web jogável** em `/prototype/web/` para validar rapidamente, em navegador (desktop e celular, sem instalação), as decisões de design mais sensíveis do documento. A v1 validou o HUD de combate e a moeda Vintém num único arquivo; a v2 evoluiu para uma arquitetura modular (`index.html` + `styles.css` + `src/*.js`, um arquivo por sistema — Player, Appearance, Classes, Bestiary, Enemy, Interactable, World, Camera, HUD, Controls, CharCreation, ClassSelect, Arena, State, Main) e cobre o loop completo:

- **Personagem em camadas**: tom de pele, cabelo, cor do cabelo, roupa, chapéu e arma equipada, renderizados proceduralmente (placeholder) com 9 estados de animação (idle/walk/run/attack/chargeAttack/dodge/hurt/tool/death) prontos para receber spritesheets reais — ver `prototype/web/ASSETS.md`.
- **Câmera** com zoom 1.4× e seguimento suave (lerp), sem solavancos.
- **HUD compacto**: barras HP/ST/MP com ícone, retrato+nome+nível+classe, relógio/dia/Vintém no canto oposto — sem caixa de fase do dia.
- **Controles em ícones**: joystick + 4 botões (Ataque, Esquiva, Habilidade 1, Habilidade 2/bloqueada) em arco solto ao redor do polegar, com cooldown por escurecimento radial. Ataque: toque = golpe normal, segurar = carrega e solta golpe pesado (com anel de carregamento visível).
- **Interação contextual**: um único botão que troca de ícone conforme o objeto mais próximo (NPC, item, baú, plantação, porta), via um componente `Interactable` genérico reutilizável.
- **Sem classe no início** → evento **O Despertar** → tela **Escolha seu Caminho** (Guerreiro/Mateiro/Encantado, com barras de pontos, arma e habilidade inicial) → **arena de teste isolada** (não afeta o save principal) → confirmação definitiva.
- **Bestiário de folclore brasileiro** (`src/bestiary.js`): 19 entradas categorizadas (hostil/territorial/neutra/guardiã/narrativa/chefe) com habitat, comportamento, ataques, fraquezas, drops e lore; duas implementadas com IA e desenho próprios (Rato-do-Mato Corrompido e Cipó Vivo), demonstrando a diferença entre uma criatura hostil e uma territorial.
- **Atmosfera dia/noite** com vagalumes à noite, e cenário com decoração leve (tufos, flores, pedras, bordas irregulares no caminho).
- **Persistência completa**: nome, aparência, classe e posição sobrevivem a fechar/abrir o jogo (`localStorage`).

Isto continua sendo um protótipo de **mecânica, UX e arquitetura**, não de arte final — ver `prototype/web/ASSETS.md` para o contrato exato de substituição de cada placeholder visual.

Como testar: servir a pasta `prototype/web/` com qualquer servidor estático (ex.: `npx http-server prototype/web`) e abrir `index.html` — scripts clássicos (não ES modules), então também funciona abrindo o arquivo direto (`file://`) na maioria dos navegadores. Para compartilhar um único arquivo, `python3 prototype/web/build_bundle.py` gera `prototype/web/dist/index.bundled.html`.

---

*Fim do documento. Este GDD cobre o escopo completo do MVP (~3–5h de conteúdo) e estabelece a base de dados/arquitetura para expansão futura em novas regiões do universo Encantaria.*
