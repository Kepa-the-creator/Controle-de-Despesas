import { HelpCircle, X } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

const FAQ = [
  {
    q: 'Qual a diferença entre "Conta" e "Pagamento" ao lançar uma despesa?',
    a: '"Pagamento" (Pix/Crédito/Débito/Dinheiro) é só uma etiqueta informativa, não afeta nenhum cálculo. "Conta" é de onde o dinheiro realmente sai — é ela que precisa estar certa (ex: "Cartão de Crédito") pra afetar o saldo daquela conta.',
  },
  {
    q: 'Quando devo usar "Saldo inicial" numa conta?',
    a: 'Só quando existe dinheiro sem uma transação correspondente — ex: "eu já tinha R$300 no bolso, sem registro de como vieram parar lá". Se o dinheiro tem uma origem que você consegue datar (salário, aposentadoria, venda), lance como Receita, não como Saldo inicial. Colocar nos dois lugares duplica o valor.',
  },
  {
    q: 'Como funciona a conta "Cartão de Crédito"?',
    a: 'Diferente de uma conta corrente, o cartão representa dívida: saldo negativo = quanto você deve. Toda compra no cartão é uma Despesa com Conta = Cartão de Crédito (vai deixando o saldo mais negativo). Quando você paga a fatura, isso é uma Transferência da Conta Corrente para o Cartão de Crédito (credita o cartão de volta em direção a zero).',
  },
  {
    q: 'Quando uso Transferência em vez de Despesa/Receita?',
    a: 'Transferência é só para mover dinheiro entre suas próprias contas (ex: tirar da conta corrente pra pagar a fatura do cartão, ou levar dinheiro pra carteira). Ela não conta como receita nem despesa nas categorias — se contasse, os gráficos ficariam inflados com dinheiro que só mudou de lugar, não que entrou ou saiu de verdade.',
  },
  {
    q: 'Como funciona uma compra parcelada?',
    a: 'Marque "Compra parcelada?", informe o valor TOTAL da compra e o número de parcelas. O app divide automaticamente e cria uma transação em cada um dos meses seguintes, todas marcadas com um badge (ex: "3/12").',
  },
  {
    q: 'Como funcionam as Despesas Fixas?',
    a: 'Cadastre uma vez (ex: Aluguel, todo dia 5) e o app gera sozinho o lançamento daquele mês, automaticamente, sempre que você abrir o dashboard naquele mês ou em meses anteriores ainda não gerados.',
  },
  {
    q: 'O que é o "Saldo Anterior" no resumo do mês?',
    a: 'É a soma de tudo que sobrou (ou faltou) nos meses anteriores ao que você está vendo. Ele entra no cálculo do "Saldo Livre" do mês atual, pra você não perder de vista o acumulado ao trocar de mês.',
  },
  {
    q: 'Qual a diferença entre Orçamento por Categoria e Meta de Economia?',
    a: 'Orçamento por categoria é um TETO de gasto (ex: no máximo R$800 em Alimentação por mês) — a barra fica vermelha se você passar. Meta de economia é um ALVO de quanto guardar (ex: juntar R$10.000 pra uma viagem), com aportes que você registra manualmente.',
  },
];

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-400" /> Como o app funciona
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto pr-1">
          {FAQ.map((item, i) => (
            <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <p className="text-sm font-semibold text-white mb-1.5">{item.q}</p>
              <p className="text-sm text-slate-400 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
