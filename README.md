# azel-salla (React)

قالب **عازل بلس** (azel-sa.com) بنمط سلة الجديد: React على محرّك `@salla.sa/twilight-theme-engine` (TanStack Start، يُعرض على السيرفر). هو تحويل كامل لقالب Twig في [`../Azel-Salla`](../Azel-Salla) بنفس التصميم والإعدادات والكومبوننتات، فلا يحتاج التاجر لإعادة إعداد شيء.

نقطة البداية قالب Raed الرسمي (`@salla.sa/theme-raed` 1.0.63)، وفوقه طبقة عازل. أسماء الكلاسات هي نفسها أسماء التصميم الستاتيك `Azel+`، وكل قواعد CSS منقولة منه كما هي.

---

## التشغيل

```bash
pnpm install            # المشروع يفرض pnpm 10
salla theme dev         # http://localhost:5173/ar و /en مع محرر القالب المحلي
pnpm build              # بناء الإنتاج
pnpm typecheck          # يحتاج app/routeTree.gen.ts الذي يولّده build أو dev
pnpm test               # Vitest
pnpm check:manifest     # التحقق من twilight.json
```

لعرض متجر عازل نفسه محلياً: `http://localhost:5173/ar?storeId=804931693`.

المتجر الذي يُعرض محلياً في `.env` (`VITE_STORE_DOMAIN`)، وافتراضياً متجر سلة التجريبي. ترتيب أقسام الرئيسية وقيم الإعدادات في المعاينة المحلية تُحفظ في `twilight.preview.json` (لا يُرفع).

---

## ما تغيّر عن نسخة Twig

| في Twig | في React |
|---|---|
| `views/layouts/master.twig` | `app/components/layout/ThemeLayout.tsx` — الألوان، زر واتساب، التوست، النوافذ المطلوبة |
| `components/header/header.twig` + `azel.js` | `layout/Header.tsx` · `SearchPanel.tsx` · `CartDrawer.tsx` · `Layers.tsx` · `useNavFit.ts` |
| `components/footer/footer.twig` | `layout/Footer.tsx` |
| `components/home/azel-*.twig` + `azel-home.js` | `components/home/azel/*.tsx` (١٢ قسماً) |
| `<custom-salla-product-card>` | `components/product/ProductCard.tsx` — مسجّلة كـ `product:card` فتستبدل البطاقة في كل مكان |
| `pages/product/single.twig` + `azel-product.js` | `product/ProductPage.tsx` · `AddToCartForm.tsx` · `TintPickers.tsx` |
| `pages/product/index.twig` + `azel-catalog.js` | `product/ProductListPage.tsx` — مسجّلة كـ `product:list-page` (التصنيف، البحث، الوسوم، الماركات، `/products`) |
| `pages/cart.twig` | `cart/CartPage.tsx` · `CartItem.tsx` |
| `pages/page-single.twig` | `page/PageSingle.tsx` |
| `pages/partials/azel/icon.twig` + `azel-utils.js` | `components/azel/Icon.tsx` · `lib/azel/icons.ts` |
| `partials/azel-tint.js` | `lib/azel/tint.ts` |
| `partials/azel-voice-source.js` | `lib/azel/voice-source.ts` |
| `src/assets/styles/azel-*.scss` | `app/styles/azel/*.scss` (تُستورد في `app.scss` بعد طبقات Raed) |
| `src/locales/{ar,en}.json` (متداخلة) | `locales/{ar,en}.json` بمفاتيح مسطّحة (`azel.cart.title`) |
| `twilight.json` | نفس الملف مع `"type": "react"` — نفس الإعدادات الـ99 والكومبوننتات الـ18 بنفس المفاتيح، وأُضيف `show_sold_count` |

بقية الصفحات (الحساب، الطلبات، المدونة، الماركات، الولاء، الشكر) يرسمها المحرّك، وتأخذ ألوان عازل وخطوطه من الجسر في `01-settings/global.scss`. كومبوننتات Raed الأصلية (`enhanced-slider`، `main-links`، …) متاحة كما كانت.

---

## الوظائف (كما في Twig)

- **الهيدر:** القائمة من لوحة سلة (أو `header_links`)، عنصر بأقسام فرعية ⇠ قائمة منسدلة بالصور، `nav_extra_links` بعدها، والروابط التي لا تتسع تنتقل إلى «المزيد» بعد أن تتقارب أولاً. عدّاد السلة يختفي حين تكون فارغة. الشريط العلوي بكود قابل للنسخ.
- **البحث:** لوحة بنتائج فورية من حرفين، و«الأكثر بحثاً» من `search_tags`.
- **درج السلة:** يفتح مع كل إضافة (إلا في صفحة السلة و«اشترِ الآن»)، يعدّل الكمية ويحذف، شريط الشحن المجاني من قاعدة المتجر وإلا `free_shipping_threshold`، و«إتمام الطلب» عبر `salla.cart.submit()`.
- **البطاقة:** الشارة (عنوان العرض أو «خصم N%»)، المفضلة، التصنيف، التقييم (`card_show_rating`)، السعر، «+» للإضافة المباشرة أو «←» لمنتج بخيارات، `card_image_fit`.
- **`hide_sold_out`:** يُحذف المنتج النافد من البيانات قبل رسم أي قائمة (الرئيسية، التصنيف، المنتجات المشابهة، كومبوننتات Raed).
- **صفحة المنتج:** المعرض (وصورة الخيار تظهر عند اختياره)، «وفّر»، سطر التقسيط، منتقي الدرجة لكل جهة مع مخطط السيارة و«نفس الدرجة للكل»، بطاقات الدرجة الواحدة، `?grade=` من بطاقة الهيرو، خطأ التصميم للخيار الناقص، «اشترِ الآن» إلى الدفع مباشرة، المزايا، التبويبات (المواصفات تظهر فقط إن وُجدت)، المشابهة، والشريط السفلي في الجوال.
- **عدد مرات الشراء:** «تم شراؤه N مرة» في سطر المعلومات بصفحة المنتج. سلة ترسل الرقم (`sold_quantity`) فقط حين يفعّل التاجر «عدد مرات البيع» من إعدادات المنتجات، والإعداد `show_sold_count` في إعدادات القالب يخفيه. سلة لا ترسل عدد مشاهدات للمنتج.
- **التصنيف:** رأس الصفحة، الفلاتر (درج تحت 960px مع عدد الفلاتر المفعّلة)، بنر الكود، أزرار الأقسام (من `shop_pills_links` أو الأقسام الفرعية)، «عرض N منتج»، الترتيب، و«عرض المزيد».
- **السلة:** خطوات الطلب، لوحة المنتجات، تذكير الضمان، وملخص سلة الأصلي.
- **الصفحات التعريفية:** محتوى فيه `<section>` يُطبع بعرض الصفحة، والنص العادي برأس أخضر وبطاقة. HTML التاجر يمر على `stripUnsafeHtml`.
- **التقييمات الصوتية:** ملف مباشر، Google Drive، Dropbox، أو SoundCloud بالمشغّل الموجي، مع مشغّل المصدر الأصلي عند رفض التشغيل المباشر، وتقييم واحد يعمل في كل مرة.

## قرارات معمارية

- **لا قراءة لـ`window` أثناء الرسم.** كل ما يخص المتصفح (المشغّل الصوتي، قياس الهيدر، أحداث السلة، `?grade=`) داخل `useEffect`، والحالة تبدأ محايدة.
- **الخيارات في صفحة المنتج** تبقى `salla-product-options` داخل النموذج (التحقق، تسعير الخيارات، المخزون). `TintPickers` يقرأ ما رسمته وينقر مدخلاتها الحقيقية؛ صف سلة يُخفى بصرياً فقط (`.az-mirrored`). هذا الجزء الوحيد الذي يلمس DOM مكوّن سلة مباشرة، لأن المكوّن لا يوفّر ذلك بطريقة أخرى.
- **الهوية مقفولة على التصميم:** القالب لا يعلن `color` ولا `fonts`، والجسر في `global.scss` على `html:root` يغلب ما يكتبه المحرّك على `:root`. ألوان التاجر الأربعة تُطبع فقط إن كانت hex صالحاً.
- **أقسام عازل تُركّب مع الصفحة** (`renderOnMount`) كما في Twig، عدا شبكتَي المنتجات اللتين تنتظران التمرير فتتأخر طلباتهما.
- **التوست:** `salla.notify` يذهب إلى توست التصميم؛ إشعار الإضافة للسلة يُترك لأن الدرج يفتح.

## التحقق

- `pnpm typecheck` نظيف، `pnpm test` (‏256 اختباراً، منها اختبارات منتقي الدرجات على markup خيارات سلة الحقيقي)، `pnpm check:manifest --strict` بلا أخطاء ولا تحذيرات، و`pnpm build` بلا تحذيرات سوى `no-manual-dom` المقصود في `TintPickers`.
- جُرّب على متجر سلة التجريبي بالمتصفح: الرئيسية، التصنيف، المنتج، درج السلة (إضافة وتعديل كمية فعليان)، صفحة السلة، البحث، العربية والإنجليزية، وعرض الجوال 390px بلا تمرير أفقي.
- جُرّب على بيانات متجر عازل نفسه (`?storeId=804931693`): منتقي الدرجة لكل جهة مع المخطط و`?grade=`، وعدد مرات الشراء.
- **لم يُجرَّب حياً:** تشغيل ملفات صوتية حقيقية.
