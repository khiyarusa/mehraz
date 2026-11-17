<div dir="rtl">

# مهراز

**فضای یادگیری آفلاین برای دانش‌آموزان پایهٔ هفتم تا دوازدهم**

مهراز در یک فایل جا می‌شود: `start.html` را باز می‌کنید و همه‌چیز آماده است.
نه سرور، نه نصب، نه حساب کاربری و نه اینترنت.

</div>

---

## What this is

MEHRAZ is a Persian-first, RTL learning space shipped as a single
self-contained HTML document. Opening `start.html` runs the whole application
from `file://`; there is no server, no installation, no account and no network
traffic. Student data stays on the device.

**Current state: pre-release quality pass plus the first PROMPT 03 pilot slice.**
The foundation (PROMPT 01) and the visual layer (PROMPT 02) are in place. The
catalogue contains **one draft lesson** from the Grade 10 Biology pilot
(chapter 1, subsection 2) with an activity, four practice questions, a
six-question chapter exam and a reconstructed diagram. It is marked ``draft`` in
the interface until it passes visual and independent verification. The other
129 catalogue books contain no content. Official content production remains
PROMPT 03 work.

<div dir="rtl">

## نقشهٔ راه

| مرحله | موضوع | وضعیت |
| --- | --- | --- |
| PROMPT 01 | پایه و معماری اولیه | انجام‌شده |
| PROMPT 02 | پالایش بصری و تجربهٔ ممتاز | انجام‌شده |
| **پاس کیفیت پیش از انتشار** | رفع نقص، پاک‌سازی متن، تثبیت ذخیره‌سازی، مستندسازی | **این نسخه** |
| PROMPT 03 | تولید کامل محتوای آموزشی | آغاز نشده |

## چه چیزی آماده است؟

| بخش | وضعیت | شاهد |
| --- | --- | --- |
| هویت بصری، لوگو، پوستهٔ روشن و شبانه | آماده | بازبینی چشمی روی ۳۶۰–۱۴۴۰ پیکسل |
| پوستهٔ سایت، ناوبری کناری و پایین | آماده | پیمایش همهٔ مسیرها بدون خطا |
| ثبت‌نام با تقویم شمسی و اعتبارسنجی | آماده | کبیسه، روز نامعتبر، سال خارج از بازه |
| داشبورد با آمار واقعی و حالت‌های خالی | آماده | اعداد از رکوردهای ذخیره‌شده |
| کتابخانه، پایه، رشته، کتاب، فصل، درس | ساختار آماده، بدون محتوا | کاتالوگ خالی |
| موتور آزمون (چهار نوع پرسش) | آماده، یک آزمون نمونه | فصل ۱ زیست‌شناسی دهم |
| مرور و مسیر پیشرفت | آماده، بدون قاعدهٔ زمان‌بندی | زمان‌بندی مرور در PROMPT 03 |
| پشتیبان JSON و بازیابی | آماده | آزمون رفت‌وبرگشت کامل |
| تنظیمات، کاهش حرکت، حریم خصوصی | آماده | — |
| محتوای درسی رسمی | در جریان — ۱ درس پیش‌نویس از ۲۲ گفتار پایلوت | [`docs/PILOT-01-BIOLOGY.md`](docs/PILOT-01-BIOLOGY.md) |

> در این نسخه هیچ درس، تمرین یا مطلب درسی ساختگی وجود ندارد. جای هر بخش محتوایی،
> یک حالت خالی روشن و یک اقدام مشخص نمایش داده می‌شود.

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
  scripts/                  ۱۶ ماژول کلاسیک، بدون هیچ کتابخانهٔ بیرونی
build/
  build.ps1                 ساخت start.html با PowerShell 5.1 (بدون وابستگی)
  harness-template.html     محیط اندازه‌گیری واکنش‌گرا (فقط توسعه)
content/
  catalog.json              ورودی محتوا (در این مرحله خالی)
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
| [`docs/SKILL-USAGE.md`](docs/SKILL-USAGE.md) | مهارت‌های بررسی‌شده و میزان استفاده |
| [`docs/ANDROID-GUIDE.md`](docs/ANDROID-GUIDE.md) | راهنمای فارسی باز کردن روی اندروید |
| [`docs/PHASE-02-INTEGRATION.md`](docs/PHASE-02-INTEGRATION.md) | افزودن محتوای رسمی در PROMPT 03 |
| [`docs/CONTENT-PIPELINE.md`](docs/CONTENT-PIPELINE.md) | وضعیت ممیزی منابع و خط‌لولهٔ محتوا |
| [`docs/CONTENT-INVENTORY.md`](docs/CONTENT-INVENTORY.md) | فهرست رسمی ۱۳۰ کتاب، پوشش پایه‌ها و رشته‌ها، وضعیت OCR |
| [`docs/PILOT-01-BIOLOGY.md`](docs/PILOT-01-BIOLOGY.md) | پایلوت اول: زیست‌شناسی دهم، پوشش واقعی و محدودیت‌ها |
| [`docs/SOURCE-MANIFEST.md`](docs/SOURCE-MANIFEST.md) | اثر انگشت فایل‌ها و ممیزی انتقال TLS |
| [`docs/SOURCE-TRANSPORT-EXCEPTION.md`](docs/SOURCE-TRANSPORT-EXCEPTION.md) | استثنای مستند و تأییدشدهٔ انتقال HTTP |
| [`docs/CONTENT-QA-REPORT.md`](docs/CONTENT-QA-REPORT.md) | بررسی‌های خودکار محتوا با PASS/FAIL |
| [`docs/CURRICULUM-COVERAGE.md`](docs/CURRICULUM-COVERAGE.md) | پوشش واقعی هر کتاب و کل پایه‌ها |
| [`docs/PHASE-03-DELIVERY.md`](docs/PHASE-03-DELIVERY.md) | وضعیت تحویل PROMPT 03 و موانع |
| [`docs/GRADE-10-CURRICULUM.md`](docs/GRADE-10-CURRICULUM.md) | نقشهٔ پایهٔ دهم، وضعیت دانلود و OCR هر کتاب |
| [`project-guidelines/AGENTS.md`](project-guidelines/AGENTS.md) | قواعد الزامی پروژه |

## اصول فنی

- **یک فایل**: تمام CSS، JS و گرافیک درون `start.html` جاسازی شده‌اند.
- **بدون شبکه**: هیچ CDN، فونت آنلاین، تصویر بیرونی، تحلیل‌گر یا تبلیغی وجود ندارد.
  سیاست امنیتی محتوا (CSP) با `connect-src 'none'` هر درخواست خارجی را می‌بندد.
- **بدون وابستگی**: نه فریم‌ورک، نه بسته، نه مرحلهٔ نصب.
- **ذخیره‌سازی صادق**: IndexedDB، با localStorage به‌عنوان پشتیبان و یک آینهٔ
  هم‌زمان؛ اگر هیچ‌کدام در دسترس نباشد، برنامه «ذخیره نشد» می‌گوید و پشتیبان
  گرفتن را پیشنهاد می‌کند. هرگز ذخیرهٔ ناموفق را موفق اعلام نمی‌کند.
- **فارسی و RTL**: تقویم شمسی، ارقام فارسی، نیم‌فاصله، چیدمان منطقی.

## محدودیت‌ها

- داده‌ها به مرورگر و دستگاه گره خورده‌اند؛ انتقال بین دستگاه‌ها فقط با فایل پشتیبان.
- پاک‌کردن داده‌های مرورگر، اطلاعات را حذف می‌کند.
- ذخیره‌سازی مرورگر رمزنگاری نشده است.
- شمارش/زمان‌بندی مرور در این نسخه فعال نیست؛ مرورها فقط نمایش داده می‌شوند.
- تست روی دستگاه اندروید واقعی و با صفحه‌خوان انجام نشده است؛ گزارش QA این موارد را
  صریحاً «تست‌نشده» علامت زده است.

</div>

---

## English summary

- **One file, zero dependencies.** `start.html` (≈343 KB) embeds all CSS, JS and
  graphics; it opens from `file://` with no server, build step or install.
- **Offline by construction.** No CDN, fonts, icons, analytics or APIs. The
  Content-Security-Policy sets `connect-src 'none'`; the build refuses to emit an
  artefact containing external references or network APIs.
- **Persian-first RTL UI.** Jalali calendar with leap-year validation, Persian
  digits, logical CSS properties, a four-step motion scale, reduced-motion
  support, light and night themes.
- **Honest persistence.** IndexedDB is primary, localStorage is the fallback and
  an always-on mirror; every write is confirmed before the UI claims success.
  Versioned JSON backups with validation and double confirmation.
- **Content-driven, empty by design.** A JSON contract
  (`content/content-contract.json`) describes books → chapters → lessons →
  sections, plus exams with four question types. PROMPT 01 ships an empty
  catalogue; PROMPT 03 fills it.
- **Honest QA.** `docs/QA-REPORT.md` records what was executed and what was not
  (no physical Android device, no screen reader, no screenshot review).

### Build (development)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File build/build.ps1
```

---

## Creator

**Amin** — Telegram [@Mozrd](https://t.me/Mozrd) · Rubika [@angosht0](https://rubika.ir/angosht0)

Creator information lives only on the in-app «درباره» page and in this section.

## License

No open-source licence has been granted yet. The code, the brand and the
documentation are the author's work; reuse requires permission. Third-party names
and any textbook material added in PROMPT 03 remain subject to their own terms.
