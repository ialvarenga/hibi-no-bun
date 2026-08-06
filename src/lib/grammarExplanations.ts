// Static, hand-authored reference data — never LLM-generated. Each entry is an
// original Portuguese paraphrase fact-checked against the matching chapter of
// Tae Kim's Guide to Japanese (guidetojapanese.org, CC BY-NC-SA 2.5), linked
// via source_url so the correctness of what's shown never depends on a model
// getting a grammar point right at request time.
export interface GrammarExplanation {
  explanation_pt: string
  example_jp: string
  example_pt: string
  source_url: string
}

export const GRAMMAR_EXPLANATIONS: Record<string, GrammarExplanation> = {
  passive: {
    explanation_pt:
      'Transforma o verbo para indicar que o sujeito sofre a ação, em vez de praticá-la. Verbos do grupo -u mudam a vogal final para -a e recebem れる (読む→読まれる); verbos -ru trocam a terminação por られる; irregulares: する→される, 来る→来られる. É comum usá-la para o "passivo de sofrimento", quando algo desagradável acontece ao sujeito por ação de outra pessoa.',
    example_jp: '私[わたし]の傘[かさ]が誰[だれ]かに使[つか]われた。',
    example_pt: 'Meu guarda-chuva foi usado por alguém.',
    source_url: 'https://guidetojapanese.org/learn/grammar/causepass',
  },
  causative: {
    explanation_pt:
      'Indica que alguém faz ou permite que outra pessoa realize uma ação. Verbos -u mudam a vogal final para -a e recebem せる (話す→話させる); verbos -ru trocam a terminação por させる; irregulares: する→させる, 来る→来させる. O contexto decide se o sentido é "obrigar" ou "deixar/permitir".',
    example_jp: '先生[せんせい]は学生[がくせい]に漢字[かんじ]を書[か]かせた。',
    example_pt: 'O professor fez os alunos escreverem kanji.',
    source_url: 'https://guidetojapanese.org/learn/grammar/causepass',
  },
  causative_passive: {
    explanation_pt:
      'Combina causativo e passivo para expressar que alguém foi forçado a fazer algo contra a própria vontade. Verbos -u recebem せられる (às vezes contraído para される); verbos -ru recebem させられる.',
    example_jp: '弟[おとうと]は野菜[やさい]を全部[ぜんぶ]食[た]べさせられた。',
    example_pt: 'Meu irmão mais novo foi obrigado a comer todos os vegetais.',
    source_url: 'https://guidetojapanese.org/learn/grammar/causepass',
  },
  keigo_sonkei: {
    explanation_pt:
      'Fala usada para elevar as ações de outra pessoa (nunca as próprias), tipicamente alguém de status mais alto. Alguns verbos comuns têm forma honorífica especial (する→なさる, 食べる/飲む→召し上がる, 言う→おっしゃる); os demais seguem a regra geral お+radical+になる, ou a forma mais simples em -られる.',
    example_jp: '先生[せんせい]はもう帰[かえ]られましたか。',
    example_pt: 'O professor já foi embora?',
    source_url: 'https://guidetojapanese.org/learn/grammar/honorific',
  },
  keigo_kenjou: {
    explanation_pt:
      'Fala usada para rebaixar as próprias ações diante de alguém de status mais alto, como sinal de respeito. Verbos comuns têm forma humilde especial (する→いたす, 言う→申す, 見る→拝見する); os demais seguem お+radical+する.',
    example_jp: '明日[あした]また電話[でんわ]いたします。',
    example_pt: 'Vou telefonar novamente amanhã.',
    source_url: 'https://guidetojapanese.org/learn/grammar/honorific',
  },
  potential: {
    explanation_pt:
      'Expressa a capacidade de fazer algo, sem precisar de uma palavra separada como "poder". Verbos -u mudam a vogal final para -e e recebem る (話す→話せる); verbos -ru trocam a terminação por られる; irregulares: する→できる, 来る→来られる. Como a ação deixa de ser diretamente voluntária, o objeto costuma vir marcado por が em vez de を.',
    example_jp: '田中[たなか]さんは日本語[にほんご]が話[はな]せる。',
    example_pt: 'O Tanaka consegue falar japonês.',
    source_url: 'https://guidetojapanese.org/learn/grammar/potential',
  },
  volitional: {
    explanation_pt:
      'Expressa a intenção de fazer algo ou convida/sugere uma ação em conjunto, equivalendo a "vamos..." ou "vou...". Verbos -u mudam a vogal final para -o e recebem う (休む→休もう); verbos -ru trocam る por よう; irregulares: する→しよう, 来る→来よう. A versão educada usa ましょう.',
    example_jp: '疲[つか]れたから、少[すこ]し休[やす]もう。',
    example_pt: 'Como estou cansado, vamos descansar um pouco.',
    source_url: 'https://guidetojapanese.org/learn/grammar/desire',
  },
  conditional_ba: {
    explanation_pt:
      'Um dos jeitos de dizer "se" em japonês, com o foco na própria condição. Forma-se trocando a terminação -u do verbo/i-adjetivo pela vogal -e mais ば (ある→あれば, 高い→高ければ). Costuma soar um pouco mais formal ou reflexivo do que たら.',
    example_jp: 'お金[かね]があれば、旅行[りょこう]に行[い]きたい。',
    example_pt: 'Se eu tivesse dinheiro, gostaria de viajar.',
    source_url: 'https://guidetojapanese.org/learn/grammar/conditionals',
  },
  conditional_tara: {
    explanation_pt:
      'Também significa "se"/"quando", mas com o foco no que acontece depois da condição — é a forma mais neutra e usada no dia a dia. Forma-se acrescentando ら à forma passada do verbo/adjetivo (ある→あったら, 高い→高かったら).',
    example_jp: '雨[あめ]が降[ふ]ったら、家[いえ]にいます。',
    example_pt: 'Se chover, vou ficar em casa.',
    source_url: 'https://guidetojapanese.org/learn/grammar/conditionals',
  },
  conditional_to: {
    explanation_pt:
      'Terceira forma de dizer "se"/"quando", usada para consequências naturais e automáticas — sempre que X acontece, Y acontece como resultado inevitável. Forma-se acrescentando と diretamente à forma simples (dicionário) do verbo/adjetivo (春になる→春になると). Por descrever um resultado automático, a segunda oração não pode ser um pedido, convite ou expressão de intenção.',
    example_jp: '春[はる]になると、桜[さくら]が咲[さ]く。',
    example_pt: 'Quando a primavera chega, as cerejeiras florescem.',
    source_url: 'https://guidetojapanese.org/learn/grammar/conditionals',
  },
  conditional_nara: {
    explanation_pt:
      'Quarta forma de dizer "se", usada para reagir a algo que a outra pessoa acabou de dizer ou a uma situação já conhecida, com o sentido de "se é esse o caso...". Forma-se acrescentando なら à forma simples do verbo/i-adjetivo, ou diretamente ao substantivo/na-adjetivo (sem だ). Diferente de ば e たら, o fato da segunda oração pode até já estar em curso quando a condição é dita.',
    example_jp: '日本[にほん]に行[い]くなら、京都[きょうと]がいいよ。',
    example_pt: 'Se você vai ao Japão, Kyoto é uma boa escolha.',
    source_url: 'https://guidetojapanese.org/learn/grammar/conditionals',
  },
  te_form: {
    explanation_pt:
      'Uma das formas mais versáteis do verbo: conecta ações em sequência, forma pedidos com ください, descreve estados contínuos com いる, e se combina com auxiliares como ある, おく, いく e くる para dar nuances diferentes. Ela mesma não indica tempo — quem fecha a frase é o último verbo.',
    example_jp: '朝[あさ]起[お]きて、シャワーを浴[あ]びて、朝[あさ]ご飯[はん]を食[た]べました。',
    example_pt: 'De manhã acordei, tomei banho e comi o café da manhã.',
    source_url: 'https://guidetojapanese.org/learn/grammar/teform',
  },
  comparison: {
    explanation_pt:
      'Compara duas coisas usando 方(ほう), que marca o lado "vencedor" da comparação, e より, que marca aquilo com que se compara (equivalente a "do que"). Para superlativos, より também aparece com palavras interrogativas (誰より, 何より) ou com a expressão 一番.',
    example_jp: '電車[でんしゃ]の方[ほう]がバスより速[はや]い。',
    example_pt: 'O trem é mais rápido do que o ônibus.',
    source_url: 'https://guidetojapanese.org/learn/grammar/comparison',
  },
  giving_receiving: {
    explanation_pt:
      'Três verbos descrevem dar e receber, e a escolha depende do ponto de vista: あげる quando eu (ou meu grupo) dou a alguém de fora; くれる quando alguém de fora me dá algo; もらう quando eu recebo de alguém, com a fonte marcada por に ou から.',
    example_jp: '友達[ともだち]が誕生日[たんじょうび]にプレゼントをくれた。',
    example_pt: 'Meu amigo me deu um presente de aniversário.',
    source_url: 'https://guidetojapanese.org/learn/grammar/favors',
  },
}
