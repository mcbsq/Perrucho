// src/pages/Shop.jsx
import React, { useState } from 'react';
import { useNavigate }     from 'react-router-dom';
import { useData }         from '../contexts/DataContext';
import { useAuth }         from '../contexts/AuthContext';
import ProductModal        from '../pages/ProductModal';
import './Shop.css';

// ─── Ícono por categoría ──────────────────────────────────────────────────────
const getCategoryIcon = (product) => {
    if (product.icon) return product.icon;
    const cat = (product.category || '').toLowerCase();
    if (cat.includes('aliment'))   return '🍖';
    if (cat.includes('higien'))    return '🛁';
    if (cat.includes('accesorio')) return '🎀';
    if (cat.includes('farmacia'))  return '💊';
    if (cat.includes('juguete'))   return '🎾';
    return '🎁';
};

// ─── Card de producto ─────────────────────────────────────────────────────────
const ProductCard = ({ product, onBuy, isLoggedIn }) => {
    const icon     = getCategoryIcon(product);
    const lowStock = Number(product.stock) <= 5 && Number(product.stock) > 0;
    const noStock  = Number(product.stock) === 0;

    return (
        <div className={`product-card-capsule ${noStock ? 'out-of-stock' : ''}`}>

            {/* Imagen / ícono */}
            <div className="product-image-box">
                {product.image
                    ? <img src={product.image} alt={product.name} />
                    : <span className="product-icon-placeholder">{icon}</span>
                }
                {noStock  && <span className="stock-tag stock-tag--none">Agotado</span>}
                {lowStock && <span className="stock-tag stock-tag--low">¡Pocas piezas!</span>}
            </div>

            {/* Info */}
            <div className="product-card-body">
                <span className="product-category-badge">{product.category || 'General'}</span>
                <h2>{product.name}</h2>
                <p className="product-description">
                    {product.description || `Producto de la categoría ${product.category}.`}
                </p>
                <div className="product-price-row">
                    <span className="product-price">${product.price}</span>
                    {Number(product.stock) > 0 && (
                        <span className="product-stock">{product.stock} disponibles</span>
                    )}
                </div>
            </div>

            {/* CTA */}
            <button
                className="btn-buy-now"
                onClick={() => onBuy(product)}
                disabled={noStock}
            >
                {noStock
                    ? 'Sin stock'
                    : isLoggedIn
                        ? 'Comprar ahora'
                        : 'Inicia sesión para comprar'
                }
            </button>
        </div>
    );
};

// ─── Página de tienda ─────────────────────────────────────────────────────────
const Shop = () => {
    const { products, loading }   = useData();
    const { isLoggedIn }          = useAuth();
    const navigate                = useNavigate();
    const [selected, setSelected] = useState(null);
    const [category, setCategory] = useState('Todos');

    const handleBuy = (product) => {
        if (!isLoggedIn) {
            navigate('/acceso', { state: { from: '/tienda' } });
            return;
        }
        setSelected(product);
    };

    // Categorías únicas desde la BD
    const categories = ['Todos', ...new Set(products.map(p => p.category).filter(Boolean))];

    const filtered = category === 'Todos'
        ? products
        : products.filter(p => p.category === category);

    return (
        <div className="shop-page-container">

            <header className="shop-header">
                <div className="premium-badge">Pet Shop Premium</div>
                <h1>Todo lo que tu <span>mejor amigo</span> necesita</h1>
                <p className="shop-subtitle">
                    Productos seleccionados con amor y calidad garantizada.
                </p>
            </header>

            {/* Filtros por categoría */}
            {!loading && products.length > 0 && (
                <div className="shop-filters">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`shop-filter-btn ${category === cat ? 'active' : ''}`}
                            onClick={() => setCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}

            {/* Grid de productos */}
            <div className="shop-grid-container">
                {loading ? (
                    <p className="no-products">Cargando productos...</p>
                ) : filtered.length > 0 ? (
                    filtered.map(product => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onBuy={handleBuy}
                            isLoggedIn={isLoggedIn}
                        />
                    ))
                ) : (
                    <div className="no-products">
                        <span>🛍️</span>
                        <p>No hay productos en esta categoría.</p>
                    </div>
                )}
            </div>

            {/* Modal de compra */}
            {selected && (
                <ProductModal
                    product={selected}
                    onClose={() => setSelected(null)}
                />
            )}
        </div>
    );
};

export default Shop;