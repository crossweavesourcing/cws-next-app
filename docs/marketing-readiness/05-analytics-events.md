# Analytics and Event Dictionary

This document provides the standard event dictionary implemented in the application and instructions for configuring Google Tag Manager (GTM) and Google Analytics 4 (GA4).

## 1. Event Specifications

All events push to the `dataLayer` and are strictly deduplicated and sanitized to prevent Personally Identifiable Information (PII) leakage.

| Event Name | Trigger | Required Parameters | Purpose |
|---|---|---|---|
| `generate_lead` | Successful contact or quote form submission | `form_id`, `subject_category` | Core macro-conversion (lead gen). |
| `view_item` | Page load of a product details page | `item_name`, `item_category` | Measure product interest. |
| `select_item` | Click on a product card in the portfolio | `item_name`, `item_category` | Measure list engagement. |
| `view_catalog` | Page load of a PDF catalog web view | `catalog_title`, `page_count` | Measure document interest. |
| `interaction_gallery` | User cycles images in product gallery | `item_name` | Micro-conversion for deeper product interest. |

### Privacy and Consent
- **Consent Mode v2**: By default, `analytics_storage`, `ad_storage`, `ad_user_data`, and `ad_personalization` are set to `denied` before GTM loads. 
- **PII Stripping**: The `trackEvent` wrapper in `src/lib/analytics.ts` explicitly strips `email`, `name`, `phone`, and `message` keys from any data object before it hits the `dataLayer`.

---

## 2. Platform Setup Checklist (Manual)

To activate tracking, complete these steps in your Google Tag Manager and GA4 accounts.

### Google Analytics 4 (GA4)
1. Go to GA4 Admin > Data Streams > Web.
2. Copy your **Measurement ID** (e.g. `G-XXXXXXXXXX`).

### Google Tag Manager (GTM)
1. Ensure your GTM ID is set in the environment variables (`NEXT_PUBLIC_GTM_ID`).
2. **Create Variables:**
   - Create a Constant Variable for your GA4 Measurement ID (`G-XXXXXXXXXX`).
   - Create Data Layer Variables for: `item_name`, `item_category`, `catalog_title`, `page_count`, `form_id`, `subject_category`.
3. **Create GA4 Config Tag:**
   - Tag Type: Google Analytics: GA4 Configuration.
   - Trigger: Initialization - All Pages.
4. **Create GA4 Event Tags for each Event:**
   - Tag Type: GA4 Event.
   - Event Name: Use the `Event Name` from the table above (e.g., `generate_lead`).
   - Event Parameters: Map the Data Layer Variables created in Step 2.
   - Trigger: Create a Custom Event Trigger matching the `Event Name`.
5. **Publish the GTM Container.**

### Search Console / Webmaster Tools Verification
The `<head>` is configured to accept verification tags through environment variables:
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
- `NEXT_PUBLIC_BING_SITE_VERIFICATION`
