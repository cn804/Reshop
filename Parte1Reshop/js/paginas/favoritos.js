'use strict';
/* Favoritos guardados en este navegador */

UI.iniciar({
    soloCompradores: true,
    render() {
        const ids = Favoritos.lista();
        const productos = Productos.publicados().filter(p => ids.includes(p.id));
        document.getElementById('favoritos').innerHTML = productos.length
            ? productos.map(UI.tarjeta).join('')
            : UI.vacio('No tienes favoritos', 'Toca ♡ en un producto para guardarlo aquí.', 'explorar.html', 'Explorar productos');
    }
});
