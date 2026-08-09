"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoriesIndexes = void 0;
exports.categoriesIndexes = [
    {
        key: { slug: 1 },
        name: 'idx_categories_slug_unique',
        unique: true,
    },
    {
        key: { name: 1 },
        name: 'idx_categories_name_unique',
        unique: true,
    },
];
