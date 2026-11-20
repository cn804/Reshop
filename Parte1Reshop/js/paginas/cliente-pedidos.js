'use strict';
/* Historial de compras del cliente */

const lista = document.getElementById('pedidos');

function render() {
    const u = Auth.actual();
    const pedidos = Pedidos.delComprador(u.id);
    lista.innerHTML = pedidos.length
        ? pedidos.map(p => UI.pedido(p, u)).join('')
        : UI.vacio('Aún no tienes reservas', 'Reserva un producto y aquí verás su estado.', 'explorar.html', 'Explorar productos');
}

if (UI.iniciar({ rol: 'cliente', render })) {
    UI.conectarAccionesPedidos(lista, render);
}
