'use strict';
/* Landing: llena "Rescates recientes" y "Más vendidos" con datos reales */

UI.iniciar({
    render() {
        const publicados = Productos.publicados();

        const recientes = publicados
            .filter(p => p.stock > 0)
            .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
            .slice(0, 3);

        document.getElementById('recientes').innerHTML = recientes.length
            ? recientes.map(UI.tarjeta).join('')
            : UI.vacio('Aún no hay rescates publicados',
                'Los negocios publican sus excedentes durante el día. ¡Vuelve pronto!',
                'registro.html?rol=emprendedor', '¿Tienes un negocio? Publica aquí');

        const porId = new Map(publicados.map(p => [p.id, p]));
        const vendidos = Pedidos.masVendidos()
            .map(v => porId.get(v.productId))
            .filter(Boolean)
            .slice(0, 3);

        document.getElementById('mas-vendidos').innerHTML = vendidos.length
            ? vendidos.map(UI.tarjeta).join('')
            : UI.vacio('Todavía no hay ventas completadas',
                'Aquí aparecerán los productos con más pedidos entregados.',
                'explorar.html', 'Explorar catálogo');
    }
});
