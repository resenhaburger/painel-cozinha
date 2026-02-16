// ========= CONFIGURAÇÃO =========
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbybDH1ay9jXNIIcOx6N3tlM_kJ5ckwJt-PioMgFIYGTgscf45BOH7N-km5RfYL_nnUZXg/exec'; // SUBSTITUA PELA SUA URL

// Variáveis globais
let cart = [];
let total = 0;
let subtotal = 0;
let pointsDiscount = 0;
let currentDrinkData = null;
let currentUpsellData = null;
let currentCategory = 'mais-pedidos';
let totalPoints = 0;
let purchaseCount = 0;
let lastAddedItem = null;
let clienteAtual = { telefone: '', pontos: 0, pedidos: 0 };
let itemParaAdicionar = null;

// Slider
let slideIndex = 0;
let sliderInterval;
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');

let isCartOpen = false;
let observer;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('ResenhaBurger carregado com sucesso!');
    
    startSlider();
    loadCartFromStorage();
    loadPointsAndPurchases();
    setupCategoryObserver();
    
    document.querySelector('.slider-btn.prev').addEventListener('click', prevSlide);
    document.querySelector('.slider-btn.next').addEventListener('click', nextSlide);
    
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => goToSlide(index));
    });
    
    setupLazyLoading();
    setupMicroInteractions();
    updateCheckoutButton();
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeAllModals();
    });
    
    updateBusinessStatus();
    setInterval(updateBusinessStatus, 60000);
    
    document.getElementById('overlay').addEventListener('click', function() {
        if (isCartOpen) toggleCart();
    });
    
    logPageView();
});

// ========= SLIDER =========
function startSlider() {
    clearInterval(sliderInterval);
    sliderInterval = setInterval(nextSlide, 5000);
}
function showSlide(n) {
    requestAnimationFrame(() => {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        if (n >= slides.length) slideIndex = 0;
        if (n < 0) slideIndex = slides.length - 1;
        slides[slideIndex].classList.add('active');
        dots[slideIndex].classList.add('active');
    });
}
function nextSlide() { slideIndex++; showSlide(slideIndex); resetSliderTimer(); }
function prevSlide() { slideIndex--; showSlide(slideIndex); resetSliderTimer(); }
function goToSlide(n) { slideIndex = n; showSlide(slideIndex); resetSliderTimer(); }
function resetSliderTimer() { clearInterval(sliderInterval); startSlider(); }

// ========= STATUS E HORÁRIO =========
function updateBusinessStatus() {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const isOpenDay = day >= 4 || day === 0;
    const currentTime = hours + (minutes / 60);
    const openTime = 18.5;
    const closeTime = 23;
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    if (isOpenDay && currentTime >= openTime && currentTime < closeTime) {
        statusIndicator.classList.add('open');
        statusIndicator.classList.remove('closed');
        statusText.textContent = 'Aberto agora';
    } else {
        statusIndicator.classList.add('closed');
        statusIndicator.classList.remove('open');
        statusText.textContent = 'Fechado agora';
    }
}
function estaNoHorarioFuncionamento() {
    const agora = new Date();
    const dia = agora.getDay();
    const hora = agora.getHours();
    const minutos = agora.getMinutes();
    const horaAtual = hora + minutos/60;
    const diasFuncionamento = [0, 4, 5, 6];
    const abertura = 18.5;
    const fechamento = 23;
    return diasFuncionamento.includes(dia) && horaAtual >= abertura && horaAtual < fechamento;
}

// ========= SCROLL E CATEGORIAS =========
function scrollToSection(id) {
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveCategory(id);
        currentCategory = id;
        updateCurrentCategoryDisplay(id);
        logCategoryView(id);
        toggleCart(false);
    }
}
function setupCategoryObserver() {
    const categories = document.querySelectorAll('.category');
    const currentCategoryElement = document.getElementById('current-category');
    const categoryNames = {
        'mais-pedidos': '⭐ Mais Pedidos',
        'smash': '🍔 Smash',
        'premium': '👑 Premium',
        'combos': '🎁 Combos',
        'promocoes': '🔥 Promoções',
        'acompanhamentos': '🍟 Acompanhamentos',
        'bebidas': '🥤 Bebidas'
    };
    const options = { root: null, rootMargin: '-100px 0px -80% 0px', threshold: 0.1 };
    observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                setActiveCategory(id);
                currentCategory = id;
                if (currentCategoryElement && categoryNames[id]) {
                    currentCategoryElement.innerHTML = `<i class="fas ${getCategoryIcon(id)}"></i> <span>${categoryNames[id]}</span>`;
                }
            }
        });
    }, options);
    categories.forEach(category => observer.observe(category));
}
function getCategoryIcon(categoryId) {
    const icons = {
        'mais-pedidos': 'fa-fire',
        'smash': 'fa-hamburger',
        'premium': 'fa-crown',
        'combos': 'fa-gift',
        'promocoes': 'fa-bolt',
        'acompanhamentos': 'fa-french-fries',
        'bebidas': 'fa-glass-whiskey'
    };
    return icons[categoryId] || 'fa-utensils';
}
function setActiveCategory(id) {
    const buttons = document.querySelectorAll('.cat-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(id)) {
            btn.classList.add('active');
        }
    });
    updateCurrentCategoryDisplay(id);
}
function updateCurrentCategoryDisplay(id) {
    const categoryNames = {
        'mais-pedidos': '⭐ Mais Pedidos',
        'smash': '🍔 Smash',
        'premium': '👑 Premium',
        'combos': '🎁 Combos',
        'promocoes': '🔥 Promoções',
        'acompanhamentos': '🍟 Acompanhamentos',
        'bebidas': '🥤 Bebidas'
    };
    const element = document.getElementById('current-category');
    if (element && categoryNames[id]) {
        element.innerHTML = `<i class="fas ${getCategoryIcon(id)}"></i> <span>${categoryNames[id]}</span>`;
    }
}

// ========= MODAL DE OBSERVAÇÕES =========
function abrirModalObs(id, nome, preco, categoria) {
    itemParaAdicionar = { id, nome, preco, categoria };
    document.getElementById('obs-modal').classList.add('active');
}
function fecharObsModal() {
    document.getElementById('obs-modal').classList.remove('active');
    itemParaAdicionar = null;
}
function adicionarAoCarrinhoComObs() {
    const obs = document.getElementById('obs-text').value;
    if (itemParaAdicionar) {
        adicionarItemAoCarrinho(itemParaAdicionar.id, itemParaAdicionar.nome, itemParaAdicionar.preco, itemParaAdicionar.categoria, obs);
        fecharObsModal();
        document.getElementById('obs-text').value = '';
        
        // Upsell inteligente para bebidas se for Smash, Premium ou Acompanhamentos
        if (itemParaAdicionar.categoria === 'smash' || itemParaAdicionar.categoria === 'premium' || itemParaAdicionar.categoria === 'acompanhamentos') {
            setTimeout(() => suggestDrinkUpsell(), 800);
        }
    }
}

// Função que realmente adiciona ao carrinho
function adicionarItemAoCarrinho(id, nome, preco, tipo, obs = '') {
    const existingItemIndex = cart.findIndex(item => item.productId === id && item.obs === obs);
    if (existingItemIndex !== -1) {
        cart[existingItemIndex].quantity += 1;
        lastAddedItem = cart[existingItemIndex];
    } else {
        const item = {
            id: Date.now() + Math.random(),
            productId: id,
            name: nome,
            price: parseFloat(preco),
            type: tipo,
            quantity: 1,
            obs: obs,
            addedAt: new Date().toISOString()
        };
        cart.push(item);
        lastAddedItem = item;
    }
    updateTotals();
    renderCart();
    saveCartToStorage();
    showNotification(`${nome} adicionado ao carrinho!`, 'success');
    updateCheckoutButton();
    logAddToCart(nome, preco, tipo);
    if (tipo === 'combo' || tipo === 'promo') {
        setTimeout(() => suggestIntelligentUpsell(nome, preco, tipo), 800);
    }
}

// ========= UPSELL DE BEBIDAS (CORRIGIDO) =========
function suggestDrinkUpsell() {
    const modal = document.getElementById('upsell-modal');
    const message = document.getElementById('upsell-message');
    const options = document.getElementById('upsell-options');
    
    message.textContent = 'Que tal adicionar uma bebida gelada? Escolha uma opção:';
    
    // Lista completa de bebidas (conforme cards da categoria "bebidas")
    const drinkOptions = [
        { name: 'Refrigerante 350ml', price: 8.90, productId: 34, openModal: 'drink', cocaPremium: 1.0 },
        { name: 'Refrigerante 600ml', price: 12.90, productId: 35, openModal: 'drink', cocaPremium: 1.5 },
        { name: 'Refrigerante 1L', price: 16.90, productId: 36, openModal: 'drink', cocaPremium: 2.0 },
        { name: 'Água Mineral 500ml', price: 6.90, productId: 37, openModal: 'water' }
    ];
    
    options.innerHTML = '';
    
    drinkOptions.forEach(optionData => {
        const option = document.createElement('div');
        option.className = 'upsell-option';
        option.innerHTML = `
            <div class="upsell-header">
                <h4>${optionData.name}</h4>
                <span class="upsell-price">R$ ${optionData.price.toFixed(2)}</span>
            </div>
            <p>${optionData.openModal === 'drink' ? 'Coca, Guaraná, Fanta, Sprite, Pepsi' : 'Com ou sem gás'}</p>
        `;
        
        option.addEventListener('click', () => {
            closeUpsellModal(); // Fecha o upsell antes de abrir o modal específico
            
            if (optionData.openModal === 'drink') {
                // Abre o modal de refrigerante com os parâmetros corretos
                showDrinkModal(optionData.name, optionData.price, optionData.cocaPremium, optionData.productId);
            } else if (optionData.openModal === 'water') {
                showWaterModal(optionData.name, optionData.price, optionData.productId);
            }
            
            showNotification(`✅ ${optionData.name} selecionado! Agora escolha a variação.`, 'success');
        });
        
        options.appendChild(option);
    });
    
    modal.classList.add('active');
}

// ========= FUNÇÕES DO CARRINHO =========
function removeFromCart(id) {
    const index = cart.findIndex(item => item.id === id);
    if (index !== -1) {
        const removedItem = cart[index];
        cart.splice(index, 1);
        updateTotals();
        renderCart();
        saveCartToStorage();
        showNotification(`${removedItem.name} removido do carrinho`, 'warning');
        updateCheckoutButton();
    }
}
function updateQuantity(id, change) {
    const itemIndex = cart.findIndex(item => item.id === id);
    if (itemIndex !== -1) {
        cart[itemIndex].quantity += change;
        if (cart[itemIndex].quantity <= 0) cart.splice(itemIndex, 1);
        updateTotals();
        renderCart();
        saveCartToStorage();
        updateCheckoutButton();
    }
}
function updateTotals() {
    subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    total = Math.max(0, subtotal - pointsDiscount);
    const itemCount = cart.reduce((count, item) => count + item.quantity, 0);
    document.getElementById('cart-count').textContent = itemCount;
    document.getElementById('subtotal').textContent = `R$ ${subtotal.toFixed(2)}`;
    document.getElementById('points-discount').textContent = `R$ ${pointsDiscount.toFixed(2)}`;
    document.getElementById('total').textContent = `R$ ${total.toFixed(2)}`;
    updateCheckoutButton();

    // Atualiza exibição dos pontos do cliente
    if (clienteAtual.telefone) {
        document.getElementById('cliente-pontos').textContent = clienteAtual.pontos;
    }
}
function renderCart() {
    const cartItems = document.getElementById('cart-items');
    const emptyState = document.getElementById('cart-empty-state');
    const cartUpsell = document.getElementById('cart-upsell');
    if (cart.length === 0) {
        cartItems.innerHTML = '';
        emptyState.style.display = 'flex';
        cartUpsell.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        cartUpsell.style.display = 'block';
        cartItems.innerHTML = '';
        cart.forEach(item => {
            const li = document.createElement('li');
            li.className = 'cart-item';
            li.innerHTML = `
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    ${item.obs ? `<div class="item-obs"><small>${item.obs}</small></div>` : ''}
                </div>
                <div class="item-details">
                    <div class="item-quantity-controls">
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)"><i class="fas fa-minus"></i></button>
                        <span class="item-qty">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)"><i class="fas fa-plus"></i></button>
                    </div>
                    <div class="item-price">R$ ${(item.price * item.quantity).toFixed(2)}</div>
                    <button class="remove-item" onclick="removeFromCart(${item.id})"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            cartItems.appendChild(li);
        });
    }
}
function toggleCart(open) {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('overlay');
    if (open === true) {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        isCartOpen = true;
    } else if (open === false) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        isCartOpen = false;
    } else {
        isCartOpen = !isCartOpen;
        if (isCartOpen) {
            sidebar.classList.add('open');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            logCartView();
        } else {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
}
function updateCheckoutButton() {
    const checkoutBtn = document.getElementById('checkout-btn');
    if (cart.length > 0) {
        checkoutBtn.disabled = false;
        checkoutBtn.innerHTML = `<i class="fab fa-whatsapp"></i> Finalizar no WhatsApp (R$ ${total.toFixed(2)})`;
    } else {
        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = `<i class="fab fa-whatsapp"></i> Finalizar no WhatsApp`;
    }
}

// ========= SISTEMA DE PONTOS =========
async function buscarPontosCliente() {
    const telefone = document.getElementById('clienteTelefone').value.replace(/\D/g, '');
    if (telefone.length < 10) return;
    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?action=cliente&telefone=${telefone}`);
        const data = await response.json();
        if (data.existe) {
            clienteAtual = data;
            document.getElementById('clienteNome').value = data.nome || '';
            document.getElementById('cliente-pontos').innerText = data.pontos || 0;
            document.getElementById('points-system').style.display = 'block';
            if (data.pedidos >= 1 && data.pontos >= 150) {
                document.getElementById('points-discount-container').style.display = 'block';
            } else {
                document.getElementById('points-discount-container').style.display = 'none';
            }
        } else {
            clienteAtual = { telefone, pontos: 0, pedidos: 0 };
            document.getElementById('points-system').style.display = 'none';
        }
    } catch (e) {
        console.error(e);
    }
}

function aplicarDescontoPontos() {
    const checkbox = document.getElementById('usarPontosCheckbox');
    if (checkbox.checked && clienteAtual.pedidos >= 1 && clienteAtual.pontos >= 150) {
        pointsDiscount = 10.00;
    } else {
        pointsDiscount = 0;
    }
    updateTotals();
    updateCheckoutButton();
}

// ========= CHECKOUT WHATSAPP =========
function checkoutWhatsApp() {
    if (cart.length === 0) {
        showNotification('Seu carrinho está vazio 😅', 'warning');
        return;
    }

    const clienteNome = document.getElementById('clienteNome').value.trim();
    const clienteTelefone = document.getElementById('clienteTelefone').value.trim();
    const clienteEndereco = document.getElementById('clienteEndereco').value.trim();
    const clienteReferencia = document.getElementById('clienteReferencia').value.trim();
    const observacoes = document.getElementById('observacoes').value.trim();

    if (!clienteNome || !clienteTelefone || !clienteEndereco) {
        showNotification('Preencha nome, WhatsApp e endereço!', 'warning');
        return;
    }

    if (!estaNoHorarioFuncionamento()) {
        const mensagemForaHorario = encodeURIComponent(
            `Fala, chefia! 👊\nA ResenhaBurger tá fechada agora 😴\nFuncionamos de quinta a domingo, das 18:30 às 23:00.\nAmanhã tem rango pesado 🍔🔥`
        );
        window.open(`https://wa.me/557133121092?text=${mensagemForaHorario}`, '_blank');
        showNotification('Fora do horário de funcionamento!', 'warning');
        return;
    }

    const pontosGanhos = Math.floor(subtotal);
    let pontosUsados = 0;
    if (document.getElementById('usarPontosCheckbox')?.checked) {
        pontosUsados = 150;
        pointsDiscount = 10;
        total = subtotal - pointsDiscount;
    } else {
        pointsDiscount = 0;
        total = subtotal;
    }

    const orderData = {
        items: cart.map(item => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            obs: item.obs
        })),
        subtotal: subtotal,
        desconto: pointsDiscount,
        total: total,
        pontosGanhos: pontosGanhos,
        pontosUsados: pontosUsados,
        clienteNome: clienteNome,
        clienteTelefone: clienteTelefone,
        clienteEndereco: `${clienteEndereco} - Ref: ${clienteReferencia}`,
        observacoes: observacoes
    };

    // Envia para planilha (opcional)
    enviarPedidoParaPlanilha(orderData);

    const phoneNumber = "557133121092";
    let message = `*RESENHABURGER - NOVO PEDIDO*%0A%0A`;
    message += `*Olá! Gostaria de fazer um pedido:*%0A%0A`;
    message += `*🍔 ITENS DO PEDIDO:*%0A`;
    cart.forEach(item => {
        message += `➤ ${item.name} x${item.quantity} - R$ ${(item.price * item.quantity).toFixed(2)}%0A`;
        if (item.obs) message += `   Obs: ${item.obs}%0A`;
    });
    message += `%0A`;
    message += `*💰 RESUMO DO PEDIDO:*%0A`;
    message += `Subtotal: R$ ${subtotal.toFixed(2)}%0A`;
    if (pointsDiscount > 0) message += `Desconto Pontos: -R$ ${pointsDiscount.toFixed(2)}%0A`;
    message += `*TOTAL: R$ ${total.toFixed(2)}*%0A`;
    message += `Pontos ganhos nesta compra: ${pontosGanhos} pontos%0A%0A`;

    message += `*👤 MEUS DADOS:*%0A`;
    message += `Nome: ${clienteNome}%0A`;
    message += `Endereço: ${clienteEndereco}%0A`;
    message += `Telefone: ${clienteTelefone}%0A`;
    if (clienteReferencia) message += `Referência: ${clienteReferencia}%0A`;
    message += `%0A*📝 OBSERVAÇÕES:*%0A${observacoes || 'Nenhuma'}%0A%0A`;
    message += `_Pedido feito através do site resenhaburger.com_%0A`;
    message += `🍔 *Hambúrguer 100% soteropolitano* 🔥`;

    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');

    totalPoints += pontosGanhos;
    purchaseCount += 1;
    savePointsAndPurchases();

    cart = [];
    subtotal = 0;
    pointsDiscount = 0;
    total = 0;
    renderCart();
    saveCartToStorage();
    updateCheckoutButton();

    document.getElementById('clienteNome').value = '';
    document.getElementById('clienteTelefone').value = '';
    document.getElementById('clienteEndereco').value = '';
    document.getElementById('clienteReferencia').value = '';
    document.getElementById('observacoes').value = '';
    document.getElementById('usarPontosCheckbox').checked = false;

    showNotification(`Pedido enviado! Você ganhou ${pontosGanhos} pontos!`, 'success');
}

// ========= LIMPAR CARRINHO =========
function limparCarrinho() {
    if (cart.length === 0) {
        showNotification('Carrinho já está vazio', 'info');
        return;
    }
    if (confirm('Tem certeza que deseja limpar todo o carrinho?')) {
        cart = [];
        subtotal = 0;
        pointsDiscount = 0;
        total = 0;
        updateTotals();
        renderCart();
        saveCartToStorage();
        updateCheckoutButton();
        showNotification('Carrinho limpo!', 'warning');
    }
}

// ========= ENVIO PARA PLANILHA =========
async function enviarPedidoParaPlanilha(orderData) {
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        console.log('Pedido enviado para a planilha!');
    } catch (error) {
        console.error('Erro ao enviar pedido:', error);
    }
}

// ========= MODAIS DE BEBIDAS =========
function showDrinkModal(name, basePrice, cocaPremium, productId) {
    currentDrinkData = { name, basePrice, cocaPremium, productId };
    const modal = document.getElementById('drink-modal');
    const title = document.getElementById('drink-modal-title');
    const options = document.getElementById('drink-options');
    title.textContent = `Escolha o refrigerante:`;
    const drinkOptions = [
        { name: 'Coca-Cola', price: basePrice + cocaPremium },
        { name: 'Guaraná Antarctica', price: basePrice },
        { name: 'Fanta Laranja', price: basePrice },
        { name: 'Sprite', price: basePrice },
        { name: 'Pepsi', price: basePrice }
    ];
    options.innerHTML = '';
    drinkOptions.forEach(drink => {
        const option = document.createElement('div');
        option.className = 'drink-option';
        option.innerHTML = `<h4>${drink.name}</h4><p>R$ ${drink.price.toFixed(2)}</p>`;
        option.addEventListener('click', () => {
            adicionarItemAoCarrinho(productId, `${name} - ${drink.name}`, drink.price, 'drink', '');
            closeDrinkModal();
            showNotification(`${drink.name} adicionado!`, 'success');
        });
        options.appendChild(option);
    });
    modal.classList.add('active');
}
function showWaterModal(name, basePrice, productId) {
    currentDrinkData = { name, basePrice, productId };
    const modal = document.getElementById('water-modal');
    const title = document.getElementById('water-modal-title');
    const options = document.getElementById('water-options');
    title.textContent = `Escolha o tipo de água:`;
    const waterOptions = [
        { name: 'Com gás', price: basePrice },
        { name: 'Sem gás', price: basePrice }
    ];
    options.innerHTML = '';
    waterOptions.forEach(water => {
        const option = document.createElement('div');
        option.className = 'drink-option';
        option.innerHTML = `<h4>${water.name}</h4><p>R$ ${water.price.toFixed(2)}</p>`;
        option.addEventListener('click', () => {
            adicionarItemAoCarrinho(productId, `${name} - ${water.name}`, water.price, 'drink', '');
            closeWaterModal();
        });
        options.appendChild(option);
    });
    modal.classList.add('active');
}
function closeDrinkModal() { document.getElementById('drink-modal').classList.remove('active'); currentDrinkData = null; }
function closeWaterModal() { document.getElementById('water-modal').classList.remove('active'); currentDrinkData = null; }
function closeAllModals() { closeDrinkModal(); closeWaterModal(); closeUpsellModal(); fecharObsModal(); }

// ========= UPSELL =========
function suggestIntelligentUpsell(itemName, itemPrice, type) {
    setTimeout(() => {
        const modal = document.getElementById('upsell-modal');
        const message = document.getElementById('upsell-message');
        const options = document.getElementById('upsell-options');
        let messageText = '';
        if (type === 'combo') messageText = `Você adicionou ${itemName}. Deseja adicionar mais algum item?`;
        else if (type === 'promo') messageText = `Você adicionou ${itemName}. Que tal complementar seu pedido?`;
        else return;
        message.textContent = messageText;
        const upsellOptions = [
            { name: 'Batata Cheddar & Bacon M', price: 29.90, description: 'O acompanhamento mais pedido!', productId: 32 },
            { name: 'Refrigerante 1L', price: 16.90, description: 'Para toda a família!', productId: 36 },
            { name: 'Nuggets 10 unidades', price: 22.90, description: 'Mais crocância!', productId: 38 }
        ];
        options.innerHTML = '';
        upsellOptions.forEach(optionData => {
            const option = document.createElement('div');
            option.className = 'upsell-option';
            option.innerHTML = `
                <div class="upsell-header">
                    <h4>${optionData.name}</h4>
                    <span class="upsell-price">R$ ${optionData.price.toFixed(2)}</span>
                </div>
                <p>${optionData.description}</p>
            `;
            option.addEventListener('click', () => {
                adicionarItemAoCarrinho(optionData.productId, optionData.name, optionData.price, 'upsell', '');
                closeUpsellModal();
                showNotification(`✅ ${optionData.name} adicionado!`, 'success');
                logUpsellConversion(itemName, optionData.name);
            });
            options.appendChild(option);
        });
        modal.classList.add('active');
    }, 1000);
}
function closeUpsellModal() { document.getElementById('upsell-modal').classList.remove('active'); currentUpsellData = null; }

// ========= NOTIFICAÇÕES =========
function showNotification(message, type = 'info') {
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    if (type === 'error') icon = 'fa-times-circle';
    notification.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: ${type === 'success' ? '#25D366' : type === 'warning' ? '#FF9800' : type === 'error' ? '#D32F2F' : '#2196F3'};
        color: white; padding: 15px 25px; border-radius: 12px; z-index: 2001; box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease-out; display: flex; align-items: center; gap: 12px; font-weight: 600; max-width: 400px;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => { if (notification.parentNode) document.body.removeChild(notification); }, 300);
    }, 3000);
}

// ========= LOCALSTORAGE =========
function saveCartToStorage() {
    try {
        localStorage.setItem('resenhaburger_cart', JSON.stringify(cart));
        localStorage.setItem('resenhaburger_totals', JSON.stringify({ subtotal, pointsDiscount, total }));
    } catch (e) { console.warn('Erro ao salvar:', e); }
}
function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('resenhaburger_cart');
        const savedTotals = localStorage.getItem('resenhaburger_totals');
        if (savedCart) cart = JSON.parse(savedCart);
        if (savedTotals) {
            const totals = JSON.parse(savedTotals);
            subtotal = totals.subtotal || 0;
            pointsDiscount = totals.pointsDiscount || 0;
            total = totals.total || 0;
        }
        updateTotals();
        renderCart();
        updateCheckoutButton();
    } catch (e) { console.warn('Erro ao carregar:', e); }
}
function loadPointsAndPurchases() {
    try {
        const savedPoints = localStorage.getItem('resenhaburger_points');
        const savedPurchaseCount = localStorage.getItem('resenhaburger_purchaseCount');
        totalPoints = savedPoints ? parseInt(savedPoints) : 0;
        purchaseCount = savedPurchaseCount ? parseInt(savedPurchaseCount) : 0;
    } catch (e) { console.warn('Erro ao carregar pontos:', e); }
}
function savePointsAndPurchases() {
    try {
        localStorage.setItem('resenhaburger_points', totalPoints.toString());
        localStorage.setItem('resenhaburger_purchaseCount', purchaseCount.toString());
    } catch (e) { console.warn('Erro ao salvar pontos:', e); }
}

// ========= OTIMIZAÇÕES =========
function setupLazyLoading() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('loaded'); imageObserver.unobserve(entry.target); } });
        });
        images.forEach(img => imageObserver.observe(img));
    } else { images.forEach(img => img.classList.add('loaded')); }
}
function setupMicroInteractions() {
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('mousedown', function() { this.style.transform = 'scale(0.95)'; });
        button.addEventListener('mouseup', function() { this.style.transform = ''; });
        button.addEventListener('mouseleave', function() { this.style.transform = ''; });
    });
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('mouseenter', function() { this.style.zIndex = '10'; });
        card.addEventListener('mouseleave', function() { this.style.zIndex = ''; });
    });
}

// ========= LOGS =========
function logPageView() { console.log('Página visualizada:', window.location.href); if (window.dataLayer) window.dataLayer.push({ event: 'page_view', page_path: window.location.pathname }); }
function logCategoryView(categoryId) { console.log('Categoria visualizada:', categoryId); if (window.dataLayer) window.dataLayer.push({ event: 'view_category', category: categoryId }); }
function logAddToCart(productName, price, type) { console.log('Produto adicionado:', productName, price, type); if (window.dataLayer) window.dataLayer.push({ event: 'add_to_cart', product_name: productName, product_price: price, product_type: type }); }
function logCartView() { console.log('Carrinho visualizado. Itens:', cart.length); if (window.dataLayer) window.dataLayer.push({ event: 'view_cart', items_count: cart.length, cart_value: total }); }
function logUpsellConversion(mainProduct, upsellProduct) { console.log('Upsell convertido:', mainProduct, '->', upsellProduct); if (window.dataLayer) window.dataLayer.push({ event: 'upsell_conversion', main_product: mainProduct, upsell_product: upsellProduct }); }

// ========= ANTES DE FECHAR =========
window.addEventListener('beforeunload', function() {
    clearInterval(sliderInterval);
    if (observer) observer.disconnect();
    saveCartToStorage();
    savePointsAndPurchases();
});