'use strict';
/* Catálogo del cliente: búsqueda, categoría, vendedor y orden por precio */

const filtro = {
    q: UI.param('q') || '',
    categoria: UI.param('categoria') || 'todos',
    orden: UI.param('orden') || 'recientes',
    vendedor: UI.param('vendedor') || ''
};

const formFiltros = document.getElementById('filtros');
const inputBusqueda = document.getElementById('busqueda');
const selectOrden = document.getElementById('orden');
const contCategorias = document.getElementById('categorias');

function normalizar(t) {
    return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function actualizarUrl() {
    const p = new URLSearchParams();
    if (filtro.q) p.set('q', filtro.q);
    if (filtro.categoria !== 'todos') p.set('categoria', filtro.categoria);
    if (filtro.orden !== 'recientes') p.set('orden', filtro.orden);
    if (filtro.vendedor) p.set('vendedor', filtro.vendedor);
    history.replaceState(null, '', 'explorar.html' + (p.toString() ? '?' + p : ''));
}

function pintarCategorias() {
    const opciones = [{ id: 'todos', nombre: 'Todos', imagen: 'img/categoria-todos.png' }].concat(CATEGORIAS);
    contCategorias.innerHTML = opciones.map(c => `
        <button type="button" class="categoria${c.id === filtro.categoria ? ' activa-categoria' : ''}"
            data-categoria="${c.id}" aria-pressed="${c.id === filtro.categoria}">
            <img src="${c.imagen}" alt="">
            <span>${c.nombre}</span>
        </button>`).join('');
}

function render() {
    pintarCategorias();

    const texto = normalizar(filtro.q.trim());
    let lista = Productos.publicados().filter(p =>
        (filtro.categoria === 'todos' || p.categoria === filtro.categoria) &&
        (!filtro.vendedor || p.sellerId === filtro.vendedor) &&
        (!texto || normalizar(p.nombre + ' ' + p.descripcion + ' ' + Auth.nombreNegocio(p.sellerId)).includes(texto))
    );

    if (filtro.orden === 'precio-asc') lista.sort((a, b) => a.precio - b.precio);
    else if (filtro.orden === 'precio-desc') lista.sort((a, b) => b.precio - a.precio);
    else lista.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));

    /* Los agotados se muestran al final */
    lista.sort((a, b) => (a.stock === 0) - (b.stock === 0));

    document.getElementById('aviso-filtro').innerHTML = filtro.vendedor ? `
        <div class="aviso-filtro">
            Mostrando productos de <strong>${UI.esc(Auth.nombreNegocio(filtro.vendedor))}</strong>
            <button type="button" class="boton boton-chico boton-secundario" id="quitar-vendedor">Ver todos los negocios</button>
        </div>` : '';

    const hayProductos = Productos.publicados().length > 0;
    document.getElementById('conteo').textContent = hayProductos
        ? `${lista.length} producto${lista.length === 1 ? '' : 's'} encontrado${lista.length === 1 ? '' : 's'}`
        : '';

    document.getElementById('resultados').innerHTML = lista.length
        ? lista.map(UI.tarjeta).join('')
        : hayProductos
            ? UI.vacio('No encontramos coincidencias', 'Prueba con otra búsqueda o categoría.')
            : UI.vacio('Aún no hay productos publicados',
                'Los negocios locales publican sus excedentes durante el día. Vuelve a explorar más adelante.',
                'index.html', 'Volver al inicio');
}

/* ---------- eventos ---------- */

inputBusqueda.value = filtro.q;
selectOrden.value = filtro.orden;

inputBusqueda.addEventListener('input', () => {
    filtro.q = inputBusqueda.value;
    actualizarUrl();
    render();
});

selectOrden.addEventListener('change', () => {
    filtro.orden = selectOrden.value;
    actualizarUrl();
    render();
});

formFiltros.addEventListener('submit', e => e.preventDefault());

contCategorias.addEventListener('click', e => {
    const b = e.target.closest('[data-categoria]');
    if (!b) return;
    filtro.categoria = b.dataset.categoria;
    actualizarUrl();
    render();
});

document.getElementById('aviso-filtro').addEventListener('click', e => {
    if (e.target.id !== 'quitar-vendedor') return;
    filtro.vendedor = '';
    actualizarUrl();
    render();
});

UI.iniciar({ seccion: 'explorar', render });
