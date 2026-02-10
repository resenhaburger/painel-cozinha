// CONFIGURAÇÕES
const APPS_SCRIPT_URL = 'SUA_URL_DO_APPS_SCRIPT';
let pedidos = [];
let alarmesAtivos = [];

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', function() {
    console.log('Painel da Cozinha carregado!');
    
    // Atualizar hora
    atualizarHora();
    setInterval(atualizarHora, 60000);
    
    // Carregar pedidos
    carregarPedidos();
    setInterval(carregarPedidos, 30000);
    
    // Verificar alarmes
    setInterval(verificarAlarmes, 10000);
    
    // Verificar fechamento automático
    setInterval(verificarFechamento, 60000);
});

// FUNÇÕES PRINCIPAIS
async function carregarPedidos() {
    try {
        // Simulação de dados - em produção, substituir por chamada real
        const pedidosMock = gerarPedidosMock();
        
        pedidos = pedidosMock;
        atualizarContadores();
        renderizarPedidos();
        verificarAlarmes();
    } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
    }
}

function gerarPedidosMock() {
    const status = ['pendente', 'em_producao', 'pronto', 'entrega'];
    const nomes = ['João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Oliveira', 'Carlos Souza'];
    const telefones = ['(71) 99999-9999', '(71) 98888-8888', '(71) 97777-7777', '(71) 96666-6666', '(71) 95555-5555'];
    
    const pedidos = [];
    
    for (let i = 1; i <= 8; i++) {
        const statusIndex = Math.floor(Math.random() * status.length);
        const nomeIndex = Math.floor(Math.random() * nomes.length);
        const hora = new Date();
        hora.setMinutes(hora.getMinutes() - Math.floor(Math.random() * 60));
        
        pedidos.push({
            id: `RES${1000 + i}`,
            numero: `RES${1000 + i}`,
            cliente: {
                id: `CLI${100 + i}`,
                nome: nomes[nomeIndex],
                telefone: telefones[nomeIndex]
            },
            itens: [
                { nome: 'Baratino', quantidade: 1, preco: 24.90 },
                { nome: 'Batata Cheddar & Bacon M', quantidade: 1, preco: 29.90 },
                { nome: 'Refrigerante 600ml', quantidade: 1, preco: 12.90 }
            ],
            total: 67.70,
            status: status[statusIndex],
            data: hora.toISOString(),
            tempoRestante: '25:00',
            tempoEstimado: new Date(hora.getTime() + 30 * 60000).toISOString(),
            observacoes: i % 3 === 0 ? 'Sem cebola, por favor' : 'Sem observações'
        });
    }
    
    return pedidos;
}

function atualizarContadores() {
    const emProducao = pedidos.filter(p => p.status === 'em_producao').length;
    const proximos = pedidos.filter(p => {
        if (p.status === 'em_producao' && p.tempoRestante) {
            const [minutos] = p.tempoRestante.split(':').map(Number);
            return minutos <= 30;
        }
        return false;
    }).length;
    const entrega = pedidos.filter(p => p.status === 'entrega').length;
    
    document.getElementById('count-em-producao').textContent = emProducao;
    document.getElementById('count-proximos').textContent = proximos;
    document.getElementById('count-entrega').textContent = entrega;
}

function renderizarPedidos() {
    const container = document.getElementById('pedidos-container');
    const template = document.getElementById('pedido-template');
    
    container.innerHTML = '';
    
    // Ordenar pedidos: pendentes primeiro, depois por tempo
    pedidos.sort((a, b) => {
        if (a.status === 'pendente' && b.status !== 'pendente') return -1;
        if (a.status !== 'pendente' && b.status === 'pendente') return 1;
        
        if (a.tempoRestante && b.tempoRestante) {
            const [minA] = a.tempoRestante.split(':').map(Number);
            const [minB] = b.tempoRestante.split(':').map(Number);
            return minA - minB;
        }
        
        return 0;
    });
    
    pedidos.forEach(pedido => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.pedido-card');
        
        // Configurar dados
        card.dataset.status = pedido.status;
        card.dataset.id = pedido.id;
        
        // Número do pedido
        card.querySelector('.pedido-number').textContent = pedido.numero.substring(3);
        
        // Hora
        const hora = new Date(pedido.data).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        card.querySelector('.pedido-time').textContent = hora;
        
        // Status
        const statusText = {
            'pendente': 'Pendente',
            'em_producao': 'Em Produção',
            'pronto': 'Pronto',
            'entrega': 'Saiu para Entrega'
        }[pedido.status];
        
        card.querySelector('.status-text').textContent = statusText;
        
        // Timer
        if (pedido.tempoRestante) {
            card.querySelector('.timer-text').textContent = pedido.tempoRestante;
            
            // Se faltar menos de 15 minutos, marcar como urgente
            const [minutos] = pedido.tempoRestante.split(':').map(Number);
            if (minutos < 15) {
                card.dataset.status = 'urgente';
                criarAlarme(pedido);
            }
        }
        
        // Cliente
        card.querySelector('.cliente-nome').textContent = pedido.cliente.nome;
        card.querySelector('.cliente-telefone').textContent = pedido.cliente.telefone;
        
        // Itens
        const itensContainer = card.querySelector('.pedido-itens');
        itensContainer.innerHTML = '';
        
        pedido.itens.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-pedido';
            itemDiv.innerHTML = `
                <span class="item-nome">${item.nome}</span>
                <span class="item-quantidade">x${item.quantidade}</span>
                <span class="item-preco">R$ ${item.preco.toFixed(2)}</span>
            `;
            itensContainer.appendChild(itemDiv);
        });
        
        // Observações
        if (pedido.observacoes && pedido.observacoes !== 'Sem observações') {
            card.querySelector('.obs-text').textContent = pedido.observacoes;
        } else {
            card.querySelector('.pedido-observacoes').style.display = 'none';
        }
        
        // Configurar botões
        const btnIniciar = card.querySelector('.action-btn.iniciar');
        const btnFinalizar = card.querySelector('.action-btn.finalizar');
        const btnEntregar = card.querySelector('.action-btn.entregar');
        
        btnIniciar.onclick = () => atualizarStatus(pedido.id, 'em_producao');
        btnFinalizar.onclick = () => atualizarStatus(pedido.id, 'pronto');
        btnEntregar.onclick = () => atualizarStatus(pedido.id, 'entrega');
        
        // Desabilitar botões conforme status
        if (pedido.status === 'em_producao') {
            btnIniciar.disabled = true;
            btnIniciar.innerHTML = '<i class="fas fa-play"></i> Em Andamento';
        }
        
        if (pedido.status === 'pronto') {
            btnIniciar.disabled = true;
            btnFinalizar.disabled = true;
            btnFinalizar.innerHTML = '<i class="fas fa-check"></i> Finalizado';
        }
        
        if (pedido.status === 'entrega') {
            btnIniciar.disabled = true;
            btnFinalizar.disabled = true;
            btnEntregar.disabled = true;
            btnEntregar.innerHTML = '<i class="fas fa-motorcycle"></i> Entregando';
        }
        
        container.appendChild(clone);
    });
}

async function atualizarStatus(pedidoId, novoStatus) {
    try {
        // Em produção, aqui faria uma chamada para o backend
        console.log(`Atualizando pedido ${pedidoId} para status: ${novoStatus}`);
        
        // Atualizar localmente
        const pedido = pedidos.find(p => p.id === pedidoId);
        if (pedido) {
            pedido.status = novoStatus;
            pedido.atualizadoEm = new Date().toISOString();
            
            // Se for para entrega, atualizar WhatsApp
            if (novoStatus === 'entrega') {
                enviarStatusWhatsApp(pedidoId, 'saiu_entrega');
            } else if (novoStatus === 'pronto') {
                enviarStatusWhatsApp(pedidoId, 'pronto_entrega');
            }
            
            carregarPedidos(); // Recarregar
            showNotification('Status atualizado!', 'success');
        }
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        showNotification('Erro ao atualizar status', 'error');
    }
}

function criarAlarme(pedido) {
    // Verificar se alarme já existe
    if (alarmesAtivos.includes(pedido.id)) return;
    
    alarmesAtivos.push(pedido.id);
    
    const alarmContainer = document.getElementById('alarm-container');
    const alarm = document.createElement('div');
    alarm.className = 'alarme';
    alarm.id = `alarme-${pedido.id}`;
    
    alarm.innerHTML = `
        <div class="alarme-header">
            <i class="fas fa-bell"></i>
            <h4>⏰ ATENÇÃO - PEDIDO URGENTE</h4>
        </div>
        <div class="alarme-body">
            <p><strong>Pedido #${pedido.numero.substring(3)}</strong> - ${pedido.cliente.nome}</p>
            <p>Tempo restante: <strong>${pedido.tempoRestante}</strong></p>
            <p>Status atual: ${pedido.status}</p>
        </div>
    `;
    
    alarmContainer.appendChild(alarm);
    
    // Tocar som de alarme
    const alarmSound = document.getElementById('alarm-sound');
    alarmSound.play().catch(e => console.log('Erro ao tocar alarme:', e));
    
    // Remover alarme após 30 segundos
    setTimeout(() => {
        const alarmeElement = document.getElementById(`alarme-${pedido.id}`);
        if (alarmeElement) {
            alarmeElement.remove();
            const index = alarmesAtivos.indexOf(pedido.id);
            if (index > -1) alarmesAtivos.splice(index, 1);
        }
    }, 30000);
}

function verificarAlarmes() {
    const agora = new Date();
    
    pedidos.forEach(pedido => {
        if (pedido.status === 'em_producao' && pedido.tempoEstimado) {
            const tempoEstimado = new Date(pedido.tempoEstimado);
            const diferenca = tempoEstimado - agora;
            const minutosRestantes = Math.floor(diferenca / (1000 * 60));
            
            if (minutosRestantes <= 15 && !alarmesAtivos.includes(pedido.id)) {
                criarAlarme(pedido);
            }
        }
    });
}

function verificarFechamento() {
    const agora = new Date();
    const hora = agora.getHours();
    const minutos = agora.getMinutes();
    
    // Encerrar após 22:30
    if ((hora === 22 && minutos >= 30) || hora >= 23) {
        document.querySelector('.auto-close span').innerHTML = 
            '<strong>🚫 COZINHA ENCERRADA</strong> - Aceitando apenas entregas';
        document.querySelector('.auto-close').style.background = 'var(--vermelho)';
    }
}

function atualizarHora() {
    const agora = new Date();
    const hora = agora.getHours().toString().padStart(2, '0');
    const minutos = agora.getMinutes().toString().padStart(2, '0');
    
    document.getElementById('current-time').textContent = `${hora}:${minutos}`;
}

function filterPedidos(filtro) {
    const cards = document.querySelectorAll('.pedido-card');
    const buttons = document.querySelectorAll('.filter-btn');
    
    // Atualizar botões ativos
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    cards.forEach(card => {
        if (filtro === 'all') {
            card.style.display = 'block';
        } else {
            card.style.display = card.dataset.status === filtro ? 'block' : 'none';
        }
    });
}

async function enviarStatusWhatsApp(pedidoId, status) {
    try {
        // Em produção, faria uma chamada para o backend
        console.log(`Enviando status ${status} para pedido ${pedidoId}`);
    } catch (error) {
        console.error('Erro ao enviar status:', error);
    }
}

function showNotification(mensagem, tipo = 'info') {
    // Remover notificações existentes
    const existing = document.querySelectorAll('.cozinha-notification');
    existing.forEach(n => n.remove());
    
    // Criar nova notificação
    const notification = document.createElement('div');
    notification.className = `cozinha-notification ${tipo}`;
    notification.innerHTML = `
        <i class="fas fa-${tipo === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${mensagem}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${tipo === 'success' ? 'var(--verde)' : 'var(--vermelho)'};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 600;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        animation: slideDown 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Estilos CSS dinâmicos
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { top: -50px; opacity: 0; }
        to { top: 20px; opacity: 1; }
    }
    
    @keyframes slideUp {
        from { top: 20px; opacity: 1; }
        to { top: -50px; opacity: 0; }
    }
`;
document.head.appendChild(style);