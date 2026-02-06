// src/pages/Shop/Shop.jsx
import React, { useState, useEffect } from 'react';
import ProductModal from './ProductModal';
import './Shop.css';

const Shop = () => {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Cargar productos desde el localStorage (dados de alta en Admin)
    useEffect(() => {
        const savedProducts = JSON.parse(localStorage.getItem('products')) || [];
        setProducts(savedProducts);
    }, []);

    const handleOpenModal = (product) => {
        setSelectedProduct(product);
    };

    const handleCloseModal = () => {
        setSelectedProduct(null);
    };

    return (
        <div className="shop-page-container">
            <header className="shop-header">
                <div className="premium-badge">Pet Shop Premium</div>
                <h1>Todo lo que tu <span>mejor amigo</span> necesita</h1>
                <p className="shop-subtitle">
                    Productos seleccionados con amor y calidad garantizada.
                </p>
            </header>

            {/* GRID DE PRODUCTOS */}
            <div className="shop-grid-container">
                {products.length > 0 ? (
                    products.map((product) => (
                        <div key={product.id} className="product-card-capsule">
                            <div className="product-image-box">
                                {product.image ? (
                                    <img src={product.image} alt={product.name} />
                                ) : (
                                    <span className="product-icon-placeholder">{product.icon || '🎁'}</span>
                                )}
                                {product.stock <= 5 && <span className="stock-tag">¡Pocas piezas!</span>}
                            </div>
                            
                            <div className="product-card-body">
                                <h2>{product.name}</h2>
                                <p className="product-description">{product.description}</p>
                                
                                <div className="product-tags-row">
                                    <span className="info-tag category">{product.category || 'General'}</span>
                                    <span className="info-tag price-tag">💰 ${product.price}</span>
                                </div>
                            </div>

                            <button 
                                className="btn-buy-now" 
                                onClick={() => handleOpenModal(product)}
                            >
                                COMPRAR AHORA
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="no-products">
                        <p>No hay productos disponibles en este momento.</p>
                    </div>
                )}
            </div>

            {/* MODAL DE COMPRA */}
            {selectedProduct && (
                <ProductModal 
                    product={selectedProduct} 
                    onClose={handleCloseModal} 
                />
            )}
        </div>
    );
};

export default Shop;