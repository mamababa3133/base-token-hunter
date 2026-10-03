# Base Token Hunter V2

این نسخه سه منبع را در معماری پروژه در نظر می‌گیرد:

1. **GeckoTerminal** — discovery استخرهای جدید و داده pool.
2. **Bitquery** — داده on-chain مربوط به معاملات Base؛ کلید API فقط در GitHub Actions نگهداری می‌شود.
3. **Unibot Base Scanner** — کانال رسمی Telegram برای کشف اولیه. در این نسخه API عمومی رسمی برای خواندن خودکار کانال فرض نشده؛ CA را می‌توان از Scanner کپی و داخل داشبورد وارد کرد.

## چرا Bitquery در GitHub Actions است؟

نباید API key را داخل JavaScript سایت GitHub Pages قرار داد؛ چون هر بازدیدکننده می‌تواند آن را ببیند. Workflow هر ۵ دقیقه با Secret به Bitquery وصل می‌شود و نتیجه را در `data/bitquery.json` می‌نویسد. مرورگر فقط فایل عمومی JSON را می‌خواند.

## راه‌اندازی Bitquery

1. در Bitquery یک API access token بساز.
2. در GitHub برو به:
   `Settings → Secrets and variables → Actions`
3. یک **Repository secret** بساز:
   - Name: `BITQUERY_API_KEY`
   - Value: توکن Bitquery
4. به `Actions → Update Bitquery Base data` برو و **Run workflow** را یک بار دستی اجرا کن.
5. اگر موفق بود، `data/bitquery.json` پر می‌شود و بعد workflow طبق schedule اجرا می‌شود.

Bitquery در مستندات فعلی برای Base، `Trading.Trades` را برای داده real-time/تقریباً ۳۰ روز اخیر و `EVM.DEXTrades` را برای جزئیات DEX معرفی می‌کند. همچنین برای درخواست‌های GraphQL خارج از IDE به API access token نیاز است.

## Unibot Base Scanner

کانال رسمی در لینک زیر است:

https://t.me/UnibotBaseScanner

این پروژه عمداً scraping غیررسمی Telegram را داخل GitHub Pages قرار نداده است. برای اتوماسیون کامل Unibot باید یک روش رسمی/مجاز برای دریافت پیام‌های کانال یا یک Telegram Bot/connector داشته باشیم.

## GitHub Pages

بعد از آپلود فایل‌ها، از:
`Settings → Pages`
منبع را روی branch اصلی و root قرار بده.

سپس سایت را باز کن.

## نکته

Bitquery برای هر توکن مقدار liquidity را از این query پر نمی‌کند؛ بنابراین فیلتر نقدینگی در ردیف‌های Bitquery ممکن است صفر باشد. مقدار liquidity برای poolهای GeckoTerminal قابل اتکاتر است. در مرحله بعد می‌توانیم یک query جداگانه Bitquery Liquidity/Pools اضافه کنیم و scoring را روی چند سیگنال بسازیم.

این ابزار فقط پایش داده است و خودش معامله انجام نمی‌دهد.
