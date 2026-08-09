"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.catalogMetadataUpdateSchema = exports.catalogMetadataSchema = void 0;
exports.getPdfLimits = getPdfLimits;
exports.slugifyCatalog = slugifyCatalog;
exports.generateCatalogMarkdown = generateCatalogMarkdown;
exports.generateSemanticCatalogMarkdown = generateSemanticCatalogMarkdown;
exports.validateCatalogScene = validateCatalogScene;
exports.isSafeCatalogLink = isSafeCatalogLink;
exports.validateCatalogPages = validateCatalogPages;
exports.isAllowedCloudinaryUrl = isAllowedCloudinaryUrl;
exports.serializeCatalog = serializeCatalog;
var zod_1 = require("zod");
var config_1 = require("@/lib/seo/config");
var catalogMetadataBaseSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(2).max(160),
    description: zod_1.z.string().trim().max(1000).default(''),
    categoryId: zod_1.z.string().regex(/^[a-f\d]{24}$/i).nullable(),
    productId: zod_1.z.string().regex(/^[a-f\d]{24}$/i).nullable(),
    seoOverrides: config_1.safeSeoOverridesSchema,
});
exports.catalogMetadataSchema = catalogMetadataBaseSchema.refine(function (value) { return value.categoryId || value.productId; }, { message: 'Choose a category, a product, or both.' });
exports.catalogMetadataUpdateSchema = catalogMetadataBaseSchema
    .omit({ categoryId: true, productId: true })
    .extend({
    slug: zod_1.z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120).optional(),
});
function getPdfLimits() {
    var _a, _b, _c, _d, _e;
    var maxUploadMb = Number((_a = process.env.PDF_MAX_UPLOAD_MB) !== null && _a !== void 0 ? _a : 25);
    var maxPages = Number((_b = process.env.PDF_MAX_PAGES) !== null && _b !== void 0 ? _b : 100);
    var dpi = Number((_c = process.env.PDF_RENDER_DPI) !== null && _c !== void 0 ? _c : 200);
    if (!Number.isFinite(maxUploadMb) || maxUploadMb < 1 || maxUploadMb > 100)
        throw new Error('Invalid PDF_MAX_UPLOAD_MB configuration.');
    if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 500)
        throw new Error('Invalid PDF_MAX_PAGES configuration.');
    if (!Number.isInteger(dpi) || dpi < 72 || dpi > 300)
        throw new Error('Invalid PDF_RENDER_DPI configuration.');
    var maxSceneMb = Number((_d = process.env.PDF_MAX_SCENE_MB) !== null && _d !== void 0 ? _d : 12);
    var parseTimeoutMs = Number((_e = process.env.PDF_PARSE_TIMEOUT_MS) !== null && _e !== void 0 ? _e : 55000);
    if (!Number.isFinite(maxSceneMb) || maxSceneMb < 1 || maxSceneMb > 14)
        throw new Error('Invalid PDF_MAX_SCENE_MB configuration.');
    if (!Number.isInteger(parseTimeoutMs) || parseTimeoutMs < 5000 || parseTimeoutMs > 300000)
        throw new Error('Invalid PDF_PARSE_TIMEOUT_MS configuration.');
    return { maxBytes: maxUploadMb * 1024 * 1024, maxUploadMb: maxUploadMb, maxPages: maxPages, dpi: dpi, maxSceneBytes: maxSceneMb * 1024 * 1024, parseTimeoutMs: parseTimeoutMs };
}
function slugifyCatalog(value) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120) || 'catalog';
}
function generateCatalogMarkdown(pages) {
    return __spreadArray([], pages, true).sort(function (a, b) { return a.pageNumber - b.pageNumber; }).map(function (page) { return "![Catalog page ".concat(page.pageNumber, "](").concat(page.secureUrl, ")"); }).join('\n\n');
}
function escapeMarkdown(value) {
    return value.replace(/[\\`*{}[\]()#+.!_|>~-]/g, '\\$&').replace(/<\/?[a-z][^>]*>/gi, '');
}
function generateSemanticCatalogMarkdown(scene) {
    return scene.pages.map(function (page) {
        var lines = ["**Page ".concat(page.pageNumber, "**")];
        for (var _i = 0, _a = page.text; _i < _a.length; _i++) {
            var item = _a[_i];
            var content = escapeMarkdown(item.content.trim());
            if (!content)
                continue;
            if (item.role === 'title')
                lines.push("# ".concat(content));
            else if (item.role === 'heading')
                lines.push("## ".concat(content));
            else if (item.role === 'header' || item.role === 'footer' || item.role === 'caption')
                lines.push("_".concat(content, "_"));
            else
                lines.push(content);
        }
        return lines.join('\n\n');
    }).join('\n\n---\n\n');
}
function validateCatalogScene(scene, expectedCount) {
    if (scene.version !== 1 || scene.pages.length !== expectedCount)
        throw new Error('Catalog scene is incomplete.');
    for (var _i = 0, _a = scene.pages.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], index = _b[0], page = _b[1];
        if (page.pageNumber !== index + 1 || page.width < 1 || page.height < 1 || !Number.isFinite(page.width) || !Number.isFinite(page.height))
            throw new Error('Catalog scene pages are invalid.');
        if (page.text.some(function (item) { return !item.content || item.transform.length !== 6 || item.transform.some(function (value) { return !Number.isFinite(value); }); }))
            throw new Error('Catalog scene text is invalid.');
        if (page.links.some(function (link) { return !isSafeCatalogLink(link.url) || link.rect.length !== 4 || link.rect.some(function (value) { return !Number.isFinite(value); }); }))
            throw new Error('Catalog scene links are invalid.');
    }
    var bytes = new TextEncoder().encode(JSON.stringify(scene)).byteLength;
    if (bytes > getPdfLimits().maxSceneBytes)
        throw new Error('Catalog scene exceeds the configured storage limit.');
}
function isSafeCatalogLink(value) {
    try {
        var url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:';
    }
    catch (_a) {
        return false;
    }
}
function validateCatalogPages(pages, expectedCount) {
    if (pages.length !== expectedCount || pages.some(function (page, index) { return page.pageNumber !== index + 1 || page.width < 1 || page.height < 1; })) {
        throw new Error('Catalog pages are incomplete or out of order.');
    }
    if (pages.some(function (page) { return !isAllowedCloudinaryUrl(page.secureUrl); }))
        throw new Error('Catalog contains an invalid page URL.');
}
function isAllowedCloudinaryUrl(value) {
    try {
        var url = new URL(value);
        return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com';
    }
    catch (_a) {
        return false;
    }
}
function serializeCatalog(document) {
    var _a, _b, _c, _d, _e, _f;
    var scene = document.scene, markdown = document.markdown, rest = __rest(document, ["scene", "markdown"]);
    return __assign(__assign({}, rest), { _id: rest._id.toString(), categoryId: (_b = (_a = rest.categoryId) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : null, productId: (_d = (_c = rest.productId) === null || _c === void 0 ? void 0 : _c.toString()) !== null && _d !== void 0 ? _d : null, createdBy: rest.createdBy.toString(), updatedBy: rest.updatedBy.toString(), createdAt: rest.createdAt.toISOString(), updatedAt: rest.updatedAt.toISOString(), publishedAt: (_f = (_e = rest.publishedAt) === null || _e === void 0 ? void 0 : _e.toISOString()) !== null && _f !== void 0 ? _f : null });
}
