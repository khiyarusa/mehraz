<div dir="rtl">

# مهراز

**سامانهٔ یادگیری آفلاین برای دانش‌آموزان**

مهراز یک وب‌سایت آموزشی است که در **یک فایل** جا می‌شود: `start.html` را باز
می‌کنید و همه‌چیز آماده است. نه سرور، نه نصب، نه حساب کاربری و نه اینترنت.

</div>

---

## What this is

MEHRAZ is a Persian-first, RTL, offline educational website distributed as a
single self-contained HTML document. Open `start.html` and the whole application
runs from `file://`: no server, no installation, no account, no network traffic.
Student data never leaves the device.

**Phase 01 (this repository) is the foundation only** — brand, shell, routes,
onboarding, local persistence, backup/restore, dashboard, library and lesson
shells, an examination engine, review and progress surfaces, settings, and the
content contract. It deliberately contains **no lessons, exercises or textbook
facts**; the catalogue ships empty and phase 02 fills it.

<div dir="rtl">

## چه چیزی ساخته شده است؟

| بخش | وضعیت |
| --- | --- |
| هویت بصری و لوگو | آماده |
| پوستهٔ سایت، ناوبری کناری و پایین، حالت موبایل و دسکتاپ | آماده |
| ثبت‌نام دانش‌آموز با تقویم شمسی (اعتبارسنجی روز، ماه، سال کبیسه) | آماده |
| داشبورد شخصی با آمار واقعی و حالت‌های خالی | آماده |
| کتابخانه، پایه، رشته، کتاب، فصل و صفحهٔ درس | ساختار آماده (بدون محتوا) |
| موتور آزمون: چهارگزینه‌ای، درست/نادرست، چندپاسخی، عددی | آماده |
| مرور، موضوع‌های ضعیف و مسیر پیشرفت | آماده |
| ذخیره‌سازی محلی + پشتیبان JSON و بازیابی | آماده |
| تنظیمات، پوستهٔ شبانه، کاهش حرکت، حریم خصوصی | آماده |
| محتوای درسی رسمی | فاز ۲ |

> در این نسخه هیچ درس، تمرین یا مطلب درسی ساختگی وجود ندارد. جای هر بخش محتوایی،
> یک حالت خالی با توضیح روشن نمایش داده می‌شود.

## شروع

۱. فایل `start.html` را دانلود یا کپی کنید.
۲. آن را با دوبار کلیک (رایانه) یا با Chrome (اندروید) باز کنید.
۳. «شروع یادگیری» را بزنید و مشخصات را وارد کنید.

در اندروید اگر فایل از مدیر فایل باز نشد، در نوار آدرس Chrome بنویسید:

```
file:///sdcard/Download/start.html
```

راهنمای کامل: [`docs/ANDROID-GUIDE.md`](docs/ANDROID-GUIDE.md)

## ساختار پروژه

```
start.html                  ← تنها فایل مورد نیاز کاربر (ساخته‌شده)
src/
  shell.html                قالب سند، CSP، صفحهٔ بارگذاری
  styles/                   tokens · layout · components · motion · responsive
  scripts/                  15 ماژول کلاسیک، بدون هیچ کتابخانهٔ بیرونی
build/
  build.ps1                 ساخت start.html با PowerShell 5.1 (بدون وابستگی)
  harness-template.html     محیط اندازه‌گیری واکنش‌گرا (فقط توسعه)
content/
  catalog.json              ورودی محتوا (در فاز ۱ خالی)
  content-contract.json     قرارداد محتوا (JSON Schema)
docs/                       مستندات مهندسی
project-guidelines/         دستورالعمل پروژه و مهارت قابل استفادهٔ مجدد
```

## ساخت (فقط برای توسعه)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File build/build.ps1
```

اسکریپت ساخت، فایل تک‌نفره را می‌سازد و اگر خروجی شامل منبع خارجی، `@import`،
`fetch(`، `XMLHttpRequest` یا `import(` پویا باشد، از نوشتن فایل خودداری می‌کند.

## مستندات

| سند | موضوع |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | معماری، چرخهٔ اجرا، روتر، لایهٔ وضعیت |
| [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) | رنگ، تایپوگرافی، فاصله، اجزا، حرکت، RTL |
| [`docs/DATA-SCHEMA.md`](docs/DATA-SCHEMA.md) | ساختار داده، نسخه‌بندی، قالب پشتیبان |
| [`docs/OFFLINE-REQUIREMENTS.md`](docs/OFFLINE-REQUIREMENTS.md) | الزامات آفلاین، CSP، محدودیت‌های `file://` |
| [`docs/QA-REPORT.md`](docs/QA-REPORT.md) | گزارش واقعی تست‌ها با PASS/FAIL/NOT TESTED |
| [`docs/ANDROID-GUIDE.md`](docs/ANDROID-GUIDE.md) | راهنمای فارسی باز کردن روی اندروید |
| [`docs/PHASE-02-INTEGRATION.md`](docs/PHASE-02-INTEGRATION.md) | افزودن محتوای رسمی در فاز ۲ |
| [`project-guidelines/AGENTS.md`](project-guidelines/AGENTS.md) | قواعد الزامی پروژه |

## اصول فنی

- **یک فایل**: تمام CSS، JS و گرافیک درون `start.html` جاسازی شده‌اند.
- **بدون شبکه**: هیچ CDN، فونت آنلاین، تصویر بیرونی، تحلیل‌گر یا تبلیغی وجود ندارد.
  سیاست امنیتی محتوا (CSP) با `connect-src 'none'` هر درخواست خارجی را می‌بندد.
- **بدون وابستگی**: نه فریم‌ورک، نه بسته، نه مرحلهٔ نصب.
- **حریم خصوصی**: اطلاعات در حافظهٔ مرورگر می‌ماند؛ پشتیبان‌گیری با فایل JSON.
- **فارسی و RTL**: تقویم شمسی، ارقام فارسی، نیم‌فاصله، چیدمان منطقی.

## محدودیت‌ها

- داده‌ها به مرورگر و دستگاه گره خورده‌اند؛ انتقال بین دستگاه‌ها فقط با فایل پشتیبان.
- پاک‌کردن داده‌های مرورگر، اطلاعات را حذف می‌کند.
- ذخیره‌سازی مرورگر رمزنگاری نشده است.
- تست روی دستگاه اندروید واقعی و با صفحه‌خوان انجام نشده است؛ گزارش QA این موارد را
  صریحاً «تست‌نشده» علامت زده است.

</div>

---

## English summary

- **One file, zero dependencies.** `start.html` (≈324 KB) embeds all CSS, JS and
  graphics; it opens from `file://` with no server, build step or install.
- **Offline by construction.** No CDN, fonts, icons, analytics or APIs. The
  Content-Security-Policy sets `connect-src 'none'`; the build refuses to emit an
  artefact containing external references or network APIs.
- **Persian-first RTL UI.** Jalali calendar with leap-year validation, Persian
  digits, logical CSS properties, reduced-motion support, light and night themes.
- **Local data only.** IndexedDB → localStorage → memory, chosen by a real
  write/read probe. Versioned JSON backups with validation and double confirmation.
- **Content-driven.** A JSON contract (`content/content-contract.json`) describes
  books → chapters → lessons → sections, plus exams with four question types.
  Phase 01 ships an empty catalogue by design.
- **Honest QA.** `docs/QA-REPORT.md` records what was executed and what was not
  (no Android device, no screen reader, no browser restart).

### Build (development)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File build/build.ps1
```

---

## Creator

**Amin** — Telegram [@Mozrd](https://t.me/Mozrd) · Rubika [@angosht0](https://rubika.ir/angosht0)

## License

No open-source licence has been granted yet. The code, the brand and the
documentation are the author's work; reuse requires permission. Third-party names
and any textbook material added in phase 02 remain subject to their own terms.
