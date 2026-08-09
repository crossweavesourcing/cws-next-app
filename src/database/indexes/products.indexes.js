"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsIndexes = void 0;
exports.productsIndexes = [
    {
        key: { slug: 1 },
        name: 'idx_products_slug_unique',
        unique: true,
    },
    {
        key: { categoryId: 1 },
        name: 'idx_products_category_id',
    },
];
