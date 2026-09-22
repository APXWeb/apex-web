/* ============================================================
   VANTA - Catalogo base (categorias, marcas e produtos)
   Loja ficticia de demonstracao. As marcas sao inventadas.
   Precos em centavos para evitar erro de ponto flutuante
   nas somas de carrinho.
   ============================================================ */

export const CATEGORIES = [
  { id: 'cozinha',    nome: 'Cozinha',      slug: 'cozinha',     art: 'bottle',     desc: 'Fritadeiras, cafeteiras e eletroportáteis do dia a dia.' },
  { id: 'casa',       nome: 'Casa',         slug: 'casa',        art: 'lamp',       desc: 'Decoração, conforto e objetos de uso diário.' },
  { id: 'bebe',       nome: 'Bebê',         slug: 'bebe',        art: 'chair',      desc: 'Carrinhos e itens de passeio para os primeiros anos.' },
  { id: 'brinquedos', nome: 'Brinquedos',   slug: 'brinquedos',  art: 'drone',      desc: 'Controle remoto, colecionáveis e diversão.' },
  { id: 'viagem',     nome: 'Viagem',       slug: 'viagem',      art: 'backpack',   desc: 'Malas, mochilas e organização de bagagem.' },
  { id: 'fitness',    nome: 'Fitness',      slug: 'fitness',     art: 'watch',      desc: 'Treino em casa, peso livre e calçado esportivo.' },
  { id: 'beleza',     nome: 'Beleza',       slug: 'beleza',      art: 'pen',        desc: 'Cabelo, cuidados pessoais e rotina.' },
  { id: 'info',       nome: 'Informática',  slug: 'informatica', art: 'notebook',   desc: 'Monitores, notebooks, carga e mobilidade.' },
  { id: 'audio',      nome: 'Áudio',        slug: 'audio',       art: 'headphones', desc: 'Fones, headsets e caixas de som.' },
];

export const MARCAS = [
  'Brasa', 'Nórdica', 'Pequeno Norte', 'Turbo Lab', 'Rota 9',
  'Ferro Bruto', 'Lumé', 'Vektor', 'Hikaru', 'Kessler',
  'Nordlys', 'Orbita', 'Vantage Lab',
];

/* Cada produto:
   fotos      -> arquivos em assets/img/produtos (sem extensao)
   cores      -> opcional; cada cor pode ter a propria galeria
   art/finish -> ilustracao de reserva, usada quando nao ha foto
   preco / precoAnterior em centavos | estoque real | nota vem das reviews */
export const PRODUCTS = [

  /* ---------------------------- Cozinha ---------------------------- */
  { id: 'vn-101', sku: 'VNT-COZ-1041', nome: 'Air Fryer Digital 5,5 L', marca: 'Brasa', cat: 'cozinha',
    fotos: ['airfryer-ninja'], art: 'bottle', finish: 'graphite',
    preco: 64990, precoAnterior: 79990, estoque: 42, estoqueMin: 10, criadoEm: '2026-02-11', vendidos: 1284, destaque: true, novo: false,
    resumo: 'Cesto de 5,5 litros, painel digital com 8 programas e circulação de ar quente.',
    desc: 'O cesto de 5,5 litros dá conta de um frango inteiro ou de uma porção de batata para quatro pessoas de uma vez só. O painel digital tem oito programas prontos (batata, frango, peixe, carne, legumes, bolo, reaquecer e desidratar) e ainda aceita ajuste manual de tempo e temperatura. A resistência superior com turbina distribui o ar em volta do alimento, o que dispensa virar a comida no meio do preparo na maior parte das receitas. O cesto e a grade saem para lavar e podem ir na máquina.',
    specs: [['Capacidade', '5,5 litros'], ['Potência', '1700 W'], ['Temperatura', '40 °C a 200 °C'], ['Programas', '8 automáticos + manual'], ['Timer', 'Até 60 minutos'], ['Voltagem', '127 V ou 220 V'], ['Garantia', '12 meses']] },

  { id: 'vn-102', sku: 'VNT-COZ-1088', nome: 'Air Fryer Compacta 4 L', marca: 'Brasa', cat: 'cozinha',
    fotos: ['airfryer-preta'], art: 'bottle', finish: 'graphite',
    preco: 39990, precoAnterior: 49990, estoque: 65, estoqueMin: 14, criadoEm: '2026-03-24', vendidos: 2140, destaque: false, novo: false,
    resumo: 'Versão compacta de 4 litros com visor frontal para acompanhar o preparo.',
    desc: 'Pensada para cozinha pequena e para quem cozinha para duas pessoas. O visor frontal deixa acompanhar o dourado sem abrir a gaveta, o que evita perder calor no meio do preparo. O controle é por dois botões giratórios, sem menu: gira o tempo, gira a temperatura e pronto. Desliga sozinha quando a gaveta é removida.',
    specs: [['Capacidade', '4 litros'], ['Potência', '1500 W'], ['Temperatura', '80 °C a 200 °C'], ['Controle', 'Analógico com visor'], ['Timer', 'Até 30 minutos'], ['Voltagem', '127 V ou 220 V'], ['Garantia', '12 meses']] },

  { id: 'vn-103', sku: 'VNT-COZ-1120', nome: 'Batedeira Planetária 5,5 L', marca: 'Brasa', cat: 'cozinha',
    fotos: ['batedeira-2', 'batedeira-1'], art: 'bottle', finish: 'rose',
    preco: 129990, precoAnterior: 159990, estoque: 18, estoqueMin: 5, criadoEm: '2026-01-18', vendidos: 312, destaque: true, novo: false,
    resumo: 'Tigela de aço inox de 5,5 litros, 10 velocidades e três batedores inclusos.',
    desc: 'O movimento planetário faz o batedor girar no próprio eixo enquanto percorre toda a tigela, o que alcança a massa encostada na parede sem precisar parar para raspar. O corpo é de metal fundido, não de plástico, e o peso mantém a máquina parada na bancada mesmo batendo massa pesada. Acompanha gancho para pão, batedor plano para massa densa e globo para claras e chantili.',
    specs: [['Tigela', 'Aço inox 5,5 litros'], ['Potência', '1200 W'], ['Velocidades', '10 + pulsar'], ['Acessórios', 'Gancho, batedor plano e globo'], ['Corpo', 'Metal fundido'], ['Voltagem', '127 V ou 220 V'], ['Garantia', '24 meses']] },

  { id: 'vn-104', sku: 'VNT-COZ-1163', nome: 'Cafeteira Elétrica 12 Xícaras', marca: 'Brasa', cat: 'cozinha',
    fotos: ['cafeteira'], art: 'bottle', finish: 'silver',
    preco: 24990, precoAnterior: null, estoque: 88, estoqueMin: 18, criadoEm: '2026-04-02', vendidos: 967, destaque: false, novo: false,
    resumo: 'Jarra de vidro de 1,5 litro, filtro permanente e base que mantém aquecido.',
    desc: 'Filtro permanente de nylon incluso, então não precisa comprar papel toda semana. A base aquecida mantém a jarra na temperatura por até 40 minutos e desliga sozinha depois disso. O sistema corta o fluxo quando a jarra é retirada, o que permite servir a primeira xícara no meio do preparo sem molhar a base.',
    specs: [['Capacidade', '1,5 litro (12 xícaras)'], ['Potência', '900 W'], ['Filtro', 'Permanente lavável'], ['Jarra', 'Vidro borossilicato'], ['Extras', 'Corta-pingos e desligamento automático'], ['Voltagem', '127 V ou 220 V'], ['Garantia', '12 meses']] },

  { id: 'vn-105', sku: 'VNT-COZ-1207', nome: 'Chaleira Elétrica Inox 2 L', marca: 'Brasa', cat: 'cozinha',
    fotos: ['chaleira-baltra', 'chaleira-tornado'], art: 'bottle', finish: 'silver',
    preco: 18990, precoAnterior: 22990, estoque: 120, estoqueMin: 25, criadoEm: '2026-02-28', vendidos: 1740, destaque: false, novo: false,
    resumo: 'Corpo inteiro em aço inox, ferve 2 litros em menos de 6 minutos.',
    desc: 'Corpo e tampa em aço inox escovado, sem plástico em contato com a água fervendo. A resistência é oculta no fundo, o que facilita a limpeza e evita o acúmulo de calcário na peça. Desliga sozinha ao ferver e também se for ligada vazia.',
    specs: [['Capacidade', '2 litros'], ['Potência', '1500 W'], ['Material', 'Aço inox 304'], ['Segurança', 'Desliga ao ferver e a seco'], ['Base', 'Giratória 360°'], ['Voltagem', '127 V ou 220 V'], ['Garantia', '12 meses']] },

  { id: 'vn-106', sku: 'VNT-COZ-1244', nome: 'Chaleira Elétrica 1,7 L Base 360°', marca: 'Brasa', cat: 'cozinha',
    fotos: ['chaleira-prestige', 'chaleira-preta'], art: 'bottle', finish: 'midnight',
    preco: 16990, precoAnterior: null, estoque: 96, estoqueMin: 20, criadoEm: '2026-05-06', vendidos: 843, destaque: false, novo: true,
    resumo: 'Base giratória, visor de nível e desligamento automático ao ferver.',
    desc: 'A base gira 360 graus, então a chaleira encaixa em qualquer posição, o que ajuda quem é canhoto ou tem pouca bancada. O visor lateral mostra o nível sem abrir a tampa. O bico foi desenhado para sair fino, o que faz diferença em café coado na hora.',
    specs: [['Capacidade', '1,7 litro'], ['Potência', '1850 W'], ['Base', 'Giratória 360° destacável'], ['Visor', 'Nível de água lateral'], ['Segurança', 'Desliga ao ferver e a seco'], ['Voltagem', '127 V ou 220 V'], ['Garantia', '12 meses']] },

  /* ----------------------------- Casa ------------------------------ */
  { id: 'vn-110', sku: 'VNT-CAS-2013', nome: 'Kit 2 Almofadas Decorativas 45×45', marca: 'Nórdica', cat: 'casa',
    fotos: ['almofada-bege'], art: 'chair', finish: 'sand',
    cores: [
      { id: 'bege',     nome: 'Bege Texturizado', hex: '#d8cbb6', fotos: ['almofada-bege'] },
      { id: 'floral',   nome: 'Floral Branco',    hex: '#f2f0ea', fotos: ['almofada-floral'] },
      { id: 'vermelho', nome: 'Floral Vermelho',  hex: '#9d2a26', fotos: ['almofada-vermelha'] },
    ],
    preco: 9990, precoAnterior: 12990, estoque: 210, estoqueMin: 40, criadoEm: '2026-03-09', vendidos: 1532, destaque: false, novo: false,
    resumo: 'Par de capas 45×45 cm em tecido encorpado, com zíper invisível.',
    desc: 'O par de capas vem com zíper invisível na base, o que deixa o acabamento limpo de qualquer ângulo. O tecido tem gramatura alta o suficiente para não deixar o enchimento aparecer e aceita lavagem na máquina em ciclo delicado. Serve em enchimento de 45 por 45 cm e também em 50 por 50 para quem gosta do caimento bem cheio.',
    specs: [['Medida', '45 × 45 cm'], ['Conteúdo', '2 capas (sem enchimento)'], ['Tecido', 'Poliéster encorpado'], ['Fechamento', 'Zíper invisível'], ['Lavagem', 'Máquina, ciclo delicado'], ['Garantia', '3 meses']] },

  { id: 'vn-111', sku: 'VNT-CAS-2056', nome: 'Caneca Térmica Inox 450 ml', marca: 'Nórdica', cat: 'casa',
    fotos: ['caneca-termica'], art: 'bottle', finish: 'graphite',
    preco: 7990, precoAnterior: null, estoque: 175, estoqueMin: 35, criadoEm: '2026-06-01', vendidos: 2210, destaque: false, novo: true,
    resumo: 'Parede dupla a vácuo, mantém quente por 6 horas e gelado por 12.',
    desc: 'Parede dupla com vácuo entre as camadas: o líquido segura a temperatura e o lado de fora não queima a mão nem sua na mesa. A alça foi dimensionada para caber o dedo inteiro, diferente das canecas térmicas que só têm um vinco. A tampa é de rosca com bico deslizante.',
    specs: [['Capacidade', '450 ml'], ['Material', 'Aço inox 304 parede dupla'], ['Quente', 'Até 6 horas'], ['Gelado', 'Até 12 horas'], ['Tampa', 'Rosca com bico deslizante'], ['Lavagem', 'Manual recomendada'], ['Garantia', '6 meses']] },

  { id: 'vn-112', sku: 'VNT-CAS-2098', nome: 'Copo Térmico 1,2 L com Alça', marca: 'Nórdica', cat: 'casa',
    fotos: ['copo-termico'], art: 'bottle', finish: 'midnight',
    preco: 12990, precoAnterior: 15990, estoque: 140, estoqueMin: 30, criadoEm: '2026-04-17', vendidos: 1187, destaque: true, novo: false,
    resumo: 'Copo de 1,2 litro com alça, canudo de inox e base que cabe no porta-copos.',
    desc: 'A base foi afinada de propósito para entrar no porta-copos do carro mesmo com o corpo largo em cima. Vem com canudo de inox e tampa com trava, então não vaza ao deitar na mochila. Parede dupla a vácuo segura o gelo por um dia inteiro de trabalho.',
    specs: [['Capacidade', '1,2 litro'], ['Material', 'Aço inox parede dupla'], ['Gelado', 'Até 24 horas'], ['Acompanha', 'Canudo de inox e escova'], ['Base', 'Cabe em porta-copos'], ['Garantia', '6 meses']] },

  /* ----------------------------- Bebê ------------------------------ */
  { id: 'vn-120', sku: 'VNT-BEB-3011', nome: 'Carrinho de Bebê Travel System', marca: 'Pequeno Norte', cat: 'bebe',
    fotos: ['carrinho-bebe-azul'], art: 'chair', finish: 'midnight',
    preco: 119990, precoAnterior: 149990, estoque: 14, estoqueMin: 4, criadoEm: '2026-01-29', vendidos: 176, destaque: true, novo: false,
    resumo: 'Carrinho e bebê conforto no mesmo sistema, com encaixe direto na base.',
    desc: 'O bebê conforto encaixa direto no carrinho e também na base do carro, então dá para sair do veículo sem acordar a criança. A suspensão independente nas quatro rodas absorve calçada ruim de verdade, não só piso liso de shopping. Fecha com uma das mãos e fica em pé sozinho depois de fechado.',
    specs: [['Idade', '0 a 36 meses'], ['Peso suportado', 'Até 15 kg'], ['Reclínio', '3 posições até 170°'], ['Acompanha', 'Bebê conforto e base'], ['Fechamento', 'Compacto, fica em pé'], ['Peso do carrinho', '11,5 kg'], ['Garantia', '12 meses']] },

  { id: 'vn-121', sku: 'VNT-BEB-3047', nome: 'Carrinho de Bebê 3 em 1 Premium', marca: 'Pequeno Norte', cat: 'bebe',
    fotos: ['carrinho-bebe-bege'], art: 'chair', finish: 'sand',
    preco: 169990, precoAnterior: null, estoque: 9, estoqueMin: 3, criadoEm: '2026-05-23', vendidos: 88, destaque: false, novo: true,
    resumo: 'Moisés, assento reversível e bebê conforto no mesmo chassi de alumínio.',
    desc: 'Três configurações no mesmo chassi: moisés para os primeiros meses, assento reversível quando a criança já senta e bebê conforto para o carro. O assento vira para a frente ou para quem empurra com um toque, sem ferramenta. O chassi é de alumínio, o que derruba o peso sem abrir mão da estabilidade.',
    specs: [['Idade', '0 a 36 meses'], ['Peso suportado', 'Até 15 kg'], ['Modos', 'Moisés, assento e bebê conforto'], ['Assento', 'Reversível'], ['Chassi', 'Alumínio'], ['Rodas', 'EVA com suspensão'], ['Garantia', '12 meses']] },

  { id: 'vn-122', sku: 'VNT-BEB-3082', nome: 'Carrinho de Bebê Reversível', marca: 'Pequeno Norte', cat: 'bebe',
    fotos: ['carrinho-bebe-rosa'], art: 'chair', finish: 'rose',
    preco: 139990, precoAnterior: 164990, estoque: 11, estoqueMin: 3, criadoEm: '2026-03-15', vendidos: 134, destaque: false, novo: false,
    resumo: 'Assento que gira para os dois lados, capota ampla e cesto reforçado.',
    desc: 'A capota desce até quase o apoio dos pés e tem tela de ventilação escondida, útil em dia quente. O cesto embaixo aguenta compra de mercado sem entortar. O assento gira para os dois lados, então a criança pode olhar para a frente ou para quem está empurrando.',
    specs: [['Idade', '0 a 36 meses'], ['Peso suportado', 'Até 15 kg'], ['Assento', 'Reversível com reclínio'], ['Capota', 'Ampla com tela de ventilação'], ['Cesto', 'Reforçado, até 5 kg'], ['Garantia', '12 meses']] },

  /* -------------------------- Brinquedos --------------------------- */
  { id: 'vn-130', sku: 'VNT-BRI-4015', nome: 'Carro de Controle Remoto Esportivo 1:14', marca: 'Turbo Lab', cat: 'brinquedos',
    fotos: ['rc-amarelo'], art: 'drone', finish: 'volt',
    preco: 27990, precoAnterior: 34990, estoque: 54, estoqueMin: 12, criadoEm: '2026-04-11', vendidos: 612, destaque: false, novo: false,
    resumo: 'Escala 1:14 com faróis funcionais, portas que abrem e rádio de 2,4 GHz.',
    desc: 'O rádio de 2,4 GHz deixa vários carros correrem juntos sem um travar o outro. Os faróis acendem, as portas abrem pelo controle e a suspensão é independente, então ele encara carpete e piso sem capotar na primeira curva. Vem com bateria recarregável e cabo USB.',
    specs: [['Escala', '1:14'], ['Rádio', '2,4 GHz'], ['Alcance', 'Até 30 metros'], ['Autonomia', '25 minutos por carga'], ['Recursos', 'Faróis e portas pelo controle'], ['Idade', 'A partir de 6 anos'], ['Garantia', '3 meses']] },

  { id: 'vn-131', sku: 'VNT-BRI-4052', nome: 'Carro de Controle Remoto Drift 1:12', marca: 'Turbo Lab', cat: 'brinquedos',
    fotos: ['rc-vermelho-1', 'rc-vermelho-2'], art: 'drone', finish: 'rose',
    preco: 34990, precoAnterior: null, estoque: 37, estoqueMin: 8, criadoEm: '2026-02-20', vendidos: 428, destaque: true, novo: false,
    resumo: 'Tração nas quatro rodas, dois jogos de pneu e até 20 km/h.',
    desc: 'Vem com dois jogos de pneu: o de borracha para andar com aderência e o liso para derrapar no piso frio. Tração nas quatro rodas com diferencial, o que deixa a derrapagem controlável em vez de virar giro aleatório. Chassi de plástico reforçado que aguenta bater na parede sem trincar.',
    specs: [['Escala', '1:12'], ['Tração', '4×4 com diferencial'], ['Velocidade', 'Até 20 km/h'], ['Rádio', '2,4 GHz'], ['Autonomia', '20 minutos por carga'], ['Acompanha', '2 jogos de pneus'], ['Garantia', '3 meses']] },

  /* ---------------------------- Viagem ----------------------------- */
  { id: 'vn-140', sku: 'VNT-VIA-5019', nome: 'Mala de Bordo com Porta USB', marca: 'Rota 9', cat: 'viagem',
    fotos: ['mala-azul'], art: 'backpack', finish: 'midnight',
    cores: [
      { id: 'azul',     nome: 'Azul Marinho', hex: '#2a3a63', fotos: ['mala-azul'] },
      { id: 'laranja',  nome: 'Laranja',      hex: '#e0662a', fotos: ['mala-laranja'] },
      { id: 'turquesa', nome: 'Turquesa',     hex: '#2fa8c4', fotos: ['mala-turquesa'] },
    ],
    preco: 44990, precoAnterior: 59990, estoque: 62, estoqueMin: 14, criadoEm: '2026-01-14', vendidos: 741, destaque: true, novo: false,
    resumo: 'Tamanho de bordo, compartimento frontal para notebook e saída USB.',
    desc: 'Dentro das medidas aceitas como bagagem de mão nas companhias que operam no Brasil. O compartimento frontal abre separado e leva notebook de até 15 polegadas, então dá para tirar o aparelho no raio X sem abrir a mala inteira. A saída USB lateral conecta em um power bank guardado no bolso interno, que não acompanha o produto.',
    specs: [['Tamanho', 'Bordo, 20 polegadas'], ['Capacidade', '38 litros'], ['Material', 'ABS + policarbonato'], ['Rodas', '4 rodas duplas 360°'], ['Fecho', 'Cadeado TSA embutido'], ['Extras', 'Saída USB e bolso para notebook'], ['Garantia', '12 meses']] },

  { id: 'vn-141', sku: 'VNT-VIA-5063', nome: 'Mochila Antifurto para Notebook 15,6"', marca: 'Rota 9', cat: 'viagem',
    fotos: ['mochila'], art: 'backpack', finish: 'graphite',
    preco: 19990, precoAnterior: null, estoque: 130, estoqueMin: 28, criadoEm: '2026-03-30', vendidos: 1893, destaque: false, novo: false,
    resumo: 'Zíper escondido, bolso secreto nas costas e tecido resistente à água.',
    desc: 'O zíper principal fica virado para as costas de quem usa, então não dá para abrir no meio do transporte público sem a pessoa sentir. O compartimento do notebook é acolchoado nos quatro lados e fica suspenso do fundo, o que protege em queda. Tecido com revestimento que segura chuva leve.',
    specs: [['Compatível', 'Notebook até 15,6"'], ['Capacidade', '25 litros'], ['Material', 'Poliéster 900D impermeabilizado'], ['Segurança', 'Zíper oculto e bolso secreto'], ['Extras', 'Passagem para cabo USB'], ['Alças', 'Acolchoadas com tela'], ['Garantia', '6 meses']] },

  /* ---------------------------- Fitness ---------------------------- */
  { id: 'vn-150', sku: 'VNT-FIT-6011', nome: 'Kit Kettlebell Revestido 4 a 20 kg', marca: 'Ferro Bruto', cat: 'fitness',
    fotos: ['kettlebell-color-1', 'kettlebell-color-2'], art: 'bottle', finish: 'volt',
    preco: 89990, precoAnterior: 109990, estoque: 23, estoqueMin: 6, criadoEm: '2026-02-06', vendidos: 264, destaque: false, novo: false,
    resumo: 'Cinco pesos revestidos em vinil, com base plana que não risca o piso.',
    desc: 'Cinco pesos que cobrem do aquecimento ao treino pesado: 4, 6, 8, 12 e 20 kg. O revestimento em vinil evita barulho e marca no piso, e cada peso tem uma cor, o que acelera montar o circuito sem procurar número. A alça é larga o suficiente para pegada com as duas mãos.',
    specs: [['Conteúdo', '5 peças: 4, 6, 8, 12 e 20 kg'], ['Material', 'Ferro fundido revestido em vinil'], ['Base', 'Plana antiderrapante'], ['Alça', 'Larga, pegada dupla'], ['Uso', 'Residencial e estúdio'], ['Garantia', '12 meses']] },

  { id: 'vn-151', sku: 'VNT-FIT-6048', nome: 'Kettlebell de Ferro Fundido 12 kg', marca: 'Ferro Bruto', cat: 'fitness',
    fotos: ['kettlebell-preto'], art: 'bottle', finish: 'graphite',
    preco: 21990, precoAnterior: null, estoque: 78, estoqueMin: 16, criadoEm: '2026-04-25', vendidos: 587, destaque: false, novo: false,
    resumo: 'Peça única em ferro fundido com pintura eletrostática fosca.',
    desc: 'Fundido em peça única, sem solda e sem enchimento de areia. A pintura eletrostática fosca segura a mão suada melhor que o acabamento brilhante e não descasca com o tempo. O peso real foi conferido com tolerância de 2 por cento.',
    specs: [['Peso', '12 kg'], ['Material', 'Ferro fundido peça única'], ['Acabamento', 'Pintura eletrostática fosca'], ['Base', 'Plana'], ['Tolerância', '± 2%'], ['Garantia', '12 meses']] },

  { id: 'vn-152', sku: 'VNT-FIT-6085', nome: 'Tênis Esportivo Leve', marca: 'Ferro Bruto', cat: 'fitness',
    fotos: ['tenis'], art: 'backpack', finish: 'ivory',
    preco: 29990, precoAnterior: 39990, estoque: 96, estoqueMin: 20, criadoEm: '2026-05-12', vendidos: 1024, destaque: false, novo: false,
    resumo: 'Cabedal em tricô respirável, entressola em EVA e 240 g por pé.',
    desc: 'Cabedal em tricô que estica onde o pé precisa e segura onde não precisa, sem costura interna raspando o dedo. A entressola de EVA injetado amortece sem ficar mole depois de duas semanas de uso. Palmilha removível, para quem usa palmilha própria.',
    specs: [['Peso', '240 g (tamanho 40)'], ['Cabedal', 'Tricô respirável'], ['Entressola', 'EVA injetado'], ['Solado', 'Borracha com tração'], ['Palmilha', 'Removível'], ['Numeração', '37 ao 44'], ['Garantia', '3 meses']] },

  /* ---------------------------- Beleza ----------------------------- */
  { id: 'vn-160', sku: 'VNT-BEL-7014', nome: 'Prancha Alisadora Profissional', marca: 'Lumé', cat: 'beleza',
    fotos: ['chapinha-preta-1', 'chapinha-preta-2'], art: 'pen', finish: 'graphite',
    cores: [
      { id: 'preto', nome: 'Preto', hex: '#1c1c20', fotos: ['chapinha-preta-1', 'chapinha-preta-2'] },
      { id: 'rosa',  nome: 'Rosa',  hex: '#e0547f', fotos: ['chapinha-rosa'] },
    ],
    preco: 15990, precoAnterior: 21990, estoque: 88, estoqueMin: 18, criadoEm: '2026-03-04', vendidos: 1476, destaque: true, novo: false,
    resumo: 'Placas de cerâmica com turmalina, aquece em 30 segundos e vai até 230 °C.',
    desc: 'As placas flutuantes acompanham a espessura da mecha, o que evita aquele ponto em que o cabelo fica preso e repuxa. Chega na temperatura em cerca de 30 segundos e mostra o valor no visor, então dá para trabalhar em temperatura baixa em cabelo fino sem chutar. Desliga sozinha depois de uma hora parada.',
    specs: [['Placas', 'Cerâmica com turmalina, flutuantes'], ['Temperatura', '150 °C a 230 °C'], ['Aquecimento', '30 segundos'], ['Visor', 'Digital'], ['Bivolt', 'Automático'], ['Cabo', '2,5 m giratório'], ['Garantia', '12 meses']] },

  { id: 'vn-161', sku: 'VNT-BEL-7059', nome: 'Secador de Cabelo Profissional 2200 W', marca: 'Lumé', cat: 'beleza',
    fotos: ['secador-preto'], art: 'pen', finish: 'graphite',
    cores: [
      { id: 'preto', nome: 'Preto',          hex: '#1c1c20', fotos: ['secador-preto'] },
      { id: 'rosa',  nome: 'Rosa Metálico',  hex: '#d98aa0', fotos: ['secador-rosa'] },
      { id: 'verde', nome: 'Verde Água',     hex: '#1f9a90', fotos: ['secador-verde'] },
    ],
    preco: 22990, precoAnterior: null, estoque: 71, estoqueMin: 15, criadoEm: '2026-04-29', vendidos: 1312, destaque: false, novo: false,
    resumo: '2200 W com motor AC, três temperaturas, duas velocidades e jato frio.',
    desc: 'Motor AC, que é o tipo usado em salão: dura mais horas ligado e mantém a força do fluxo do começo ao fim. Acompanha difusor para cacho e dois concentradores de larguras diferentes. O botão de ar frio fica embaixo do dedo indicador, na posição em que se usa de verdade.',
    specs: [['Potência', '2200 W'], ['Motor', 'AC profissional'], ['Ajustes', '3 temperaturas e 2 velocidades'], ['Acompanha', 'Difusor e 2 concentradores'], ['Extra', 'Jato de ar frio'], ['Cabo', '3 m'], ['Garantia', '12 meses']] },

  { id: 'vn-162', sku: 'VNT-BEL-7096', nome: 'Escova de Dente Elétrica Recarregável', marca: 'Lumé', cat: 'beleza',
    fotos: ['escova-dental'], art: 'pen', finish: 'ivory',
    preco: 17990, precoAnterior: 22990, estoque: 154, estoqueMin: 30, criadoEm: '2026-06-04', vendidos: 2087, destaque: false, novo: true,
    resumo: 'Movimento oscilante, sensor de pressão e bateria para duas semanas.',
    desc: 'A cabeça redonda oscila e gira, formato que a maioria dos dentistas recomenda para remover placa na linha da gengiva. O sensor acende quando a pressão passa do ponto, o que protege o esmalte de quem escova com força. O temporizador avisa a cada 30 segundos para trocar de quadrante.',
    specs: [['Movimento', 'Oscilante e rotativo'], ['Sensor', 'De pressão com aviso luminoso'], ['Temporizador', '2 minutos, aviso a cada 30 s'], ['Bateria', 'Até 14 dias por carga'], ['Acompanha', '2 refis e estojo de viagem'], ['Garantia', '12 meses']] },

  /* -------------------------- Informática -------------------------- */
  { id: 'vn-170', sku: 'VNT-INF-8012', nome: 'Monitor 24" Full HD 100 Hz', marca: 'Hikaru', cat: 'info',
    fotos: ['monitor-acer'], art: 'monitor', finish: 'graphite',
    preco: 74990, precoAnterior: 89990, estoque: 31, estoqueMin: 8, criadoEm: '2026-02-17', vendidos: 418, destaque: true, novo: false,
    resumo: 'Painel IPS de 24 polegadas, 100 Hz, com HDMI e DisplayPort.',
    desc: 'IPS de verdade, com cor estável mesmo olhando de lado, o que importa quando duas pessoas dividem a tela. Os 100 Hz deixam o movimento do mouse visivelmente mais liso que os 60 Hz do monitor comum, sem cobrar preço de monitor gamer. Bordas finas nos três lados facilitam montar com dois monitores lado a lado.',
    specs: [['Tela', '23,8" IPS 1920×1080'], ['Taxa', '100 Hz'], ['Resposta', '1 ms MPRT'], ['Conexões', 'HDMI 1.4 e DisplayPort 1.2'], ['Suporte', 'Inclinação, VESA 100'], ['Extras', 'FreeSync e filtro de luz azul'], ['Garantia', '12 meses']] },

  { id: 'vn-171', sku: 'VNT-INF-8047', nome: 'Monitor 22" Full HD IPS', marca: 'Hikaru', cat: 'info',
    fotos: ['monitor-pcv'], art: 'monitor', finish: 'graphite',
    preco: 59990, precoAnterior: null, estoque: 44, estoqueMin: 10, criadoEm: '2026-05-08', vendidos: 356, destaque: false, novo: false,
    resumo: 'Opção compacta de 22 polegadas para home office e estudo.',
    desc: 'Tamanho que resolve mesa pequena sem apertar a leitura: 22 polegadas em Full HD dão densidade parecida com a de um notebook de 15, então o texto sai nítido na distância normal de trabalho. Consumo baixo e suporte VESA para quem quer braço articulado.',
    specs: [['Tela', '21,5" IPS 1920×1080'], ['Taxa', '75 Hz'], ['Conexões', 'HDMI e VGA'], ['Suporte', 'Inclinação, VESA 100'], ['Consumo', '18 W típico'], ['Garantia', '12 meses']] },

  { id: 'vn-172', sku: 'VNT-INF-8083', nome: 'Monitor 27" Borda Fina 75 Hz', marca: 'Hikaru', cat: 'info',
    fotos: ['monitor-philips'], art: 'monitor', finish: 'silver',
    preco: 94990, precoAnterior: 109990, estoque: 19, estoqueMin: 5, criadoEm: '2026-03-21', vendidos: 221, destaque: false, novo: false,
    resumo: '27 polegadas com bordas quase invisíveis e ajuste de altura.',
    desc: 'As 27 polegadas dão espaço real para duas janelas lado a lado sem diminuir a fonte. O suporte sobe, desce e gira, então dá para alinhar a linha dos olhos com o topo da tela sem improvisar com livro embaixo. Vem com cabo HDMI na caixa.',
    specs: [['Tela', '27" IPS 1920×1080'], ['Taxa', '75 Hz'], ['Conexões', 'HDMI, DisplayPort e VGA'], ['Ajustes', 'Altura, inclinação e giro'], ['Suporte', 'VESA 100'], ['Acompanha', 'Cabo HDMI'], ['Garantia', '12 meses']] },

  { id: 'vn-173', sku: 'VNT-INF-8121', nome: 'Notebook 14" 16 GB e SSD de 512 GB', marca: 'Vektor', cat: 'info',
    fotos: ['notebook'], art: 'notebook', finish: 'silver',
    preco: 289990, precoAnterior: 339990, estoque: 12, estoqueMin: 4, criadoEm: '2026-01-24', vendidos: 143, destaque: true, novo: false,
    resumo: 'Corpo de alumínio, 16 GB de RAM, SSD de 512 GB e 1,3 kg.',
    desc: 'Carcaça de alumínio em peça única, que não torce ao levantar pelo canto. Os 16 GB de memória dão folga para muitas abas, planilha grande e uma máquina virtual ao mesmo tempo. O SSD NVMe faz o sistema abrir em poucos segundos. Teclado retroiluminado e leitor de digital no botão de ligar.',
    specs: [['Tela', '14" IPS 1920×1080'], ['Memória', '16 GB DDR4'], ['Armazenamento', 'SSD NVMe 512 GB'], ['Peso', '1,3 kg'], ['Bateria', 'Até 10 horas'], ['Portas', '2× USB-C, 2× USB-A e HDMI'], ['Garantia', '12 meses']] },

  { id: 'vn-174', sku: 'VNT-INF-8156', nome: 'Tablet 10,1" Wi-Fi 128 GB', marca: 'Vektor', cat: 'info',
    fotos: ['tablet'], art: 'notebook', finish: 'graphite',
    preco: 99990, precoAnterior: null, estoque: 26, estoqueMin: 6, criadoEm: '2026-04-14', vendidos: 198, destaque: false, novo: false,
    resumo: 'Tela de 10,1 polegadas, 128 GB e bateria para o dia inteiro.',
    desc: 'Tamanho de tela que funciona tanto para ler quanto para assistir sem virar peso na mão. Os 128 GB seguram série baixada para viagem sem apagar nada antes. Suporta caneta ativa e teclado por Bluetooth, vendidos separados.',
    specs: [['Tela', '10,1" 1920×1200'], ['Armazenamento', '128 GB expansível'], ['Memória', '4 GB'], ['Bateria', '7000 mAh'], ['Conexão', 'Wi-Fi 5 e Bluetooth 5.0'], ['Extras', 'Suporta caneta ativa'], ['Garantia', '12 meses']] },

  { id: 'vn-175', sku: 'VNT-INF-8194', nome: 'Smartphone 5G 256 GB', marca: 'Vektor', cat: 'info',
    fotos: ['celular'], art: 'notebook', finish: 'graphite',
    preco: 249990, precoAnterior: 289990, estoque: 17, estoqueMin: 5, criadoEm: '2026-02-09', vendidos: 265, destaque: true, novo: false,
    resumo: 'Tela de 6,7 polegadas, 256 GB, câmera tripla e carga rápida de 45 W.',
    desc: 'Tela grande com taxa de 120 Hz, o que deixa a rolagem lisa e a leitura mais confortável. Câmera tripla com estabilização óptica na principal, então foto em restaurante à noite sai utilizável. A carga de 45 W tira do zero aos 60 por cento em meia hora.',
    specs: [['Tela', '6,7" AMOLED 120 Hz'], ['Armazenamento', '256 GB'], ['Memória', '8 GB'], ['Câmeras', '50 MP + 12 MP + 8 MP'], ['Bateria', '5000 mAh, carga de 45 W'], ['Rede', '5G, dual SIM'], ['Garantia', '12 meses']] },

  { id: 'vn-176', sku: 'VNT-INF-8228', nome: 'Power Bank 20.000 mAh com 4 Cabos', marca: 'Vantage Lab', cat: 'info',
    fotos: ['powerbank-cabos'], art: 'charger', finish: 'graphite',
    preco: 14990, precoAnterior: 19990, estoque: 188, estoqueMin: 40, criadoEm: '2026-03-12', vendidos: 2643, destaque: true, novo: false,
    resumo: 'Quatro cabos embutidos e carga de três aparelhos ao mesmo tempo.',
    desc: 'Os quatro cabos ficam presos no próprio corpo: USB-C, Lightning, micro USB e um de entrada. É a diferença entre lembrar do cabo e não lembrar. Carrega três aparelhos ao mesmo tempo e tem proteção contra sobrecarga, curto e superaquecimento.',
    specs: [['Capacidade', '20.000 mAh'], ['Cabos', '4 embutidos (USB-C, Lightning, micro USB)'], ['Saídas', '3 simultâneas'], ['Potência', '22,5 W máximo'], ['Entrada', 'USB-C'], ['Proteções', 'Sobrecarga, curto e temperatura'], ['Garantia', '6 meses']] },

  { id: 'vn-177', sku: 'VNT-INF-8262', nome: 'Power Bank 30.000 mAh com Display', marca: 'Vantage Lab', cat: 'info',
    fotos: ['powerbank-display'], art: 'charger', finish: 'graphite',
    preco: 19990, precoAnterior: null, estoque: 122, estoqueMin: 26, criadoEm: '2026-05-30', vendidos: 1420, destaque: false, novo: true,
    resumo: 'Visor com a porcentagem exata, 30.000 mAh e carga rápida de 22,5 W.',
    desc: 'O visor mostra a porcentagem real em número, não quatro luzinhas que não dizem nada. Trinta mil miliamperes seguram um celular por três a quatro cargas completas ou um fim de semana fora sem tomada. Aceita carga rápida tanto na entrada quanto na saída.',
    specs: [['Capacidade', '30.000 mAh'], ['Visor', 'Digital com porcentagem'], ['Saídas', '2× USB-A e 1× USB-C'], ['Potência', '22,5 W'], ['Entrada', 'USB-C 18 W'], ['Peso', '580 g'], ['Garantia', '6 meses']] },

  { id: 'vn-178', sku: 'VNT-INF-8297', nome: 'Power Bank Slim 10.000 mAh PD 22,5 W', marca: 'Vantage Lab', cat: 'info',
    fotos: ['powerbank-prata'], art: 'charger', finish: 'silver',
    preco: 10990, precoAnterior: null, estoque: 240, estoqueMin: 50, criadoEm: '2026-04-06', vendidos: 3105, destaque: false, novo: false,
    resumo: 'Corpo fino de alumínio que cabe no bolso, com Power Delivery.',
    desc: 'Fino o bastante para andar no bolso da calça sem estufar. A carcaça de alumínio dissipa calor melhor que o plástico, o que mantém a velocidade de carga estável do começo ao fim. Acompanha cabo USB-C para USB-C.',
    specs: [['Capacidade', '10.000 mAh'], ['Espessura', '14 mm'], ['Saídas', 'USB-C PD e USB-A'], ['Potência', '22,5 W'], ['Material', 'Alumínio'], ['Acompanha', 'Cabo USB-C'], ['Garantia', '6 meses']] },

  { id: 'vn-179', sku: 'VNT-INF-8331', nome: 'Projetor LED Full HD 1080p', marca: 'Vektor', cat: 'info',
    fotos: ['projetor-2', 'projetor-1'], art: 'camera', finish: 'ivory',
    preco: 79990, precoAnterior: 99990, estoque: 21, estoqueMin: 6, criadoEm: '2026-06-07', vendidos: 337, destaque: false, novo: true,
    resumo: 'Resolução nativa 1080p, espelhamento de celular e até 200 polegadas.',
    desc: 'Resolução nativa Full HD, não apenas compatível: a diferença aparece na legenda pequena. Espelha celular por Wi-Fi sem cabo e também aceita HDMI de videogame ou TV box. Ajuste de distorção vertical e horizontal, útil quando ele não fica exatamente de frente para a parede.',
    specs: [['Resolução', '1920×1080 nativa'], ['Brilho', '9000 lumens de LED'], ['Tela', '40 a 200 polegadas'], ['Conexões', 'HDMI, USB, Wi-Fi e Bluetooth'], ['Correção', 'Keystone vertical e horizontal'], ['Alto-falante', '2× 5 W integrados'], ['Garantia', '12 meses']] },

  { id: 'vn-180', sku: 'VNT-INF-8366', nome: 'Smartwatch AMOLED 1,85"', marca: 'Orbita', cat: 'info',
    fotos: ['smartwatch'], art: 'watch', finish: 'graphite',
    preco: 19990, precoAnterior: 27990, estoque: 145, estoqueMin: 30, criadoEm: '2026-05-16', vendidos: 2914, destaque: true, novo: false,
    resumo: 'Tela AMOLED, chamadas por Bluetooth e bateria de até 7 dias.',
    desc: 'A tela AMOLED de 1,85 polegada mantém o preto real, o que ajuda a leitura no sol e economiza bateria com o mostrador escuro. Atende chamada pelo próprio relógio, com microfone e alto-falante. Acompanha mais de cem modos de exercício e monitor de frequência cardíaca contínuo.',
    specs: [['Tela', 'AMOLED 1,85"'], ['Bateria', 'Até 7 dias de uso'], ['Chamadas', 'Bluetooth com microfone'], ['Sensores', 'Frequência cardíaca e oxigenação'], ['Resistência', 'IP68'], ['Compatível', 'Android e iOS'], ['Garantia', '12 meses']] },

  /* ----------------------------- Áudio ----------------------------- */
  { id: 'vn-190', sku: 'VNT-AUD-9017', nome: 'Headphone Bluetooth com Cancelamento de Ruído', marca: 'Nordlys', cat: 'audio',
    fotos: ['headphone'], art: 'headphones', finish: 'graphite',
    preco: 34990, precoAnterior: 44990, estoque: 67, estoqueMin: 14, criadoEm: '2026-02-24', vendidos: 1108, destaque: true, novo: false,
    resumo: 'Cancelamento ativo, 40 horas de bateria e almofadas viscoelásticas.',
    desc: 'O cancelamento ativo derruba o ronco constante de ônibus e ar-condicionado, que é onde ele faz mais diferença. As almofadas em espuma viscoelástica distribuem a pressão em vez de apertar um ponto só, o que muda tudo em uso longo. Dobra para dentro e cabe na mochila sem estojo rígido.',
    specs: [['Drivers', '40 mm'], ['Bateria', 'Até 40 horas'], ['Conexão', 'Bluetooth 5.3 e cabo P2'], ['Recursos', 'ANC e modo transparência'], ['Carga', 'USB-C, 10 min para 5 h'], ['Peso', '265 g'], ['Garantia', '12 meses']] },

  { id: 'vn-191', sku: 'VNT-AUD-9054', nome: 'Fone Bluetooth TWS com Estojo', marca: 'Nordlys', cat: 'audio',
    fotos: ['fone-case'], art: 'earbuds', finish: 'ivory',
    preco: 12990, precoAnterior: null, estoque: 210, estoqueMin: 45, criadoEm: '2026-04-20', vendidos: 3421, destaque: false, novo: false,
    resumo: 'Sem fio de verdade, com estojo que rende mais quatro recargas.',
    desc: 'Pareia sozinho ao abrir o estojo, sem entrar em configuração toda vez. Cada lado funciona separado, então dá para usar um só e deixar o outro carregando. O estojo guarda mais quatro cargas completas, o que fecha uma semana de uso normal longe da tomada.',
    specs: [['Bateria', '6 h + 24 h no estojo'], ['Conexão', 'Bluetooth 5.3'], ['Resistência', 'IPX4'], ['Controles', 'Toque em cada lado'], ['Carga', 'USB-C'], ['Peso', '4 g por fone'], ['Garantia', '6 meses']] },

  { id: 'vn-192', sku: 'VNT-AUD-9091', nome: 'Headset Gamer com Microfone', marca: 'Kessler', cat: 'audio',
    fotos: ['headset-mic'], art: 'headphones', finish: 'graphite',
    preco: 15990, precoAnterior: 19990, estoque: 103, estoqueMin: 22, criadoEm: '2026-03-27', vendidos: 1247, destaque: false, novo: false,
    resumo: 'Microfone articulado com cancelamento de ruído e conexão P2 ou USB.',
    desc: 'O microfone articulado chega perto da boca sem precisar gritar, e o cancelamento corta o barulho do teclado no meio da chamada. Funciona no PC por USB e no console ou celular pelo P2, sem adaptador. A haste tem ajuste com trava, então não escorrega durante a partida.',
    specs: [['Drivers', '50 mm'], ['Microfone', 'Articulado com cancelamento'], ['Conexão', 'USB e P2 3,5 mm'], ['Compatível', 'PC, PS5, Xbox e celular'], ['Almofadas', 'Espuma com revestimento macio'], ['Cabo', '2 m'], ['Garantia', '6 meses']] },

  { id: 'vn-193', sku: 'VNT-AUD-9128', nome: 'Headset Gamer RGB 7.1', marca: 'Kessler', cat: 'audio',
    fotos: ['headset-rgb-1', 'headset-rgb-2'], art: 'headphones', finish: 'iris',
    preco: 22990, precoAnterior: null, estoque: 58, estoqueMin: 12, criadoEm: '2026-06-02', vendidos: 736, destaque: false, novo: true,
    resumo: 'Surround 7.1 por software, iluminação RGB e almofadas em couro sintético.',
    desc: 'O surround 7.1 por software ajuda a localizar passo e tiro pelo lado certo em jogo competitivo. A iluminação RGB é configurável pelo aplicativo e também pode ser desligada. As almofadas em couro sintético isolam mais o ambiente do que as de tecido, útil em casa cheia.',
    specs: [['Drivers', '50 mm'], ['Som', 'Surround 7.1 virtual'], ['Iluminação', 'RGB configurável'], ['Microfone', 'Omnidirecional retrátil'], ['Conexão', 'USB'], ['Compatível', 'PC e PS5'], ['Garantia', '12 meses']] },

  { id: 'vn-194', sku: 'VNT-AUD-9163', nome: 'Caixa de Som Bluetooth à Prova d’Água', marca: 'Kessler', cat: 'audio',
    fotos: ['caixa-som'], art: 'speaker', finish: 'volt',
    preco: 17990, precoAnterior: 22990, estoque: 94, estoqueMin: 20, criadoEm: '2026-05-04', vendidos: 1583, destaque: false, novo: false,
    resumo: 'Resistência IPX7, 24 horas de bateria e alça de transporte.',
    desc: 'IPX7 significa que aguenta cair na piscina e ser retirada, não apenas respingo. A bateria segura um dia inteiro de praia em volume médio. Duas unidades podem ser pareadas para tocar em estéreo de verdade, uma em cada canal.',
    specs: [['Potência', '20 W RMS'], ['Bateria', 'Até 24 horas'], ['Resistência', 'IPX7'], ['Conexão', 'Bluetooth 5.3 e AUX'], ['Extras', 'Pareamento estéreo entre duas unidades'], ['Carga', 'USB-C'], ['Garantia', '12 meses']] },
];

/* Variacoes do mesmo produto em outra capacidade ou configuracao.
   Reaproveitam a foto e a ficha do item de origem, como acontece
   em anuncio real de marketplace. */
const VARIACOES = [
  ['vn-101', 'Air Fryer Digital 8 L Família',         84990, 27,  486,  'Cesto de 8 litros para preparar para até seis pessoas de uma vez.'],
  ['vn-104', 'Cafeteira Elétrica 20 Xícaras',         32990, 53,  614,  'Jarra de 2,4 litros para escritório e casa cheia.'],
  ['vn-112', 'Copo Térmico 900 ml com Alça',          10990, 168, 1349, 'Versão de 900 ml, mais leve para levar na academia.'],
  ['vn-141', 'Mochila para Notebook 17" Impermeável', 24990, 87,  902,  'Espaço para notebook de 17 polegadas e tecido selado contra chuva.'],
  ['vn-151', 'Kettlebell de Ferro Fundido 20 kg',     32990, 41,  318,  'Peça única de 20 kg para treino de força avançado.'],
  ['vn-170', 'Monitor 24" IPS 165 Hz',                99990, 22,  274,  'Mesmo painel de 24 polegadas em versão de 165 Hz com FreeSync Premium.'],
  ['vn-191', 'Fone Bluetooth TWS Esportivo',           9990, 196, 2410, 'Ponta com aleta de fixação para correr sem soltar.'],
  ['vn-140', 'Mala de Viagem Grande 28"',             69990, 34,  392,  'Tamanho despachado, 95 litros, com o mesmo fecho TSA.'],
];

VARIACOES.forEach(([baseId, nome, preco, estoque, vendidos, resumo], i) => {
  const base = PRODUCTS.find(p => p.id === baseId);
  const n = 300 + i;
  PRODUCTS.push({
    id: `vn-${n}`,
    // Mesma familia do item de origem, com o numero deslocado.
    sku: base.sku.replace(/(\d+)$/, (m) => String(Number(m) + 500)),
    nome,
    marca: base.marca,
    cat: base.cat,
    fotos: base.fotos,
    cores: base.cores,
    art: base.art,
    finish: base.finish,
    preco,
    precoAnterior: i % 3 === 0 ? Math.round(preco * 1.24 / 100) * 100 : null,
    estoque,
    estoqueMin: Math.max(4, Math.round(estoque * 0.2)),
    criadoEm: ['2026-01-16', '2026-02-22', '2026-03-18', '2026-04-09', '2026-05-25', '2026-06-06'][i % 6],
    vendidos,
    destaque: false,
    novo: i % 4 === 0,
    resumo,
    desc: base.desc,
    specs: base.specs,
  });
});

export const PRODUCT_BY_ID = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
