# TakoMusic Website

TakoMusicの公式サイト。[music.takos.jp](https://music.takos.jp)

## Tech Stack

- [Vite](https://vite.dev/) - Build tool
- [SolidJS](https://www.solidjs.com/) - UI framework
- [Tailwind CSS v4](https://tailwindcss.com/) - Styling
- [Cloudflare Pages](https://pages.cloudflare.com/) - Hosting

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
```

Output: `dist/`

## Deploy

```bash
npm run deploy
```

Cloudflare Pagesにデプロイされます。

### Custom Domain Setup

1. Cloudflare Dashboardで `takomusic` プロジェクトを開く
2. Custom domains → Add custom domain
3. `music.takos.jp` を追加
4. DNSレコードを設定

## i18n (多言語対応)

対応言語:
- 日本語 (ja)
- English (en)

翻訳ファイル: `src/i18n/translations.ts`

### 言語の追加方法

1. `src/i18n/translations.ts` に新しい言語を追加
2. `src/i18n/context.tsx` の `languages` 配列に追加

## Project Structure

```
website/
├── src/
│   ├── components/
│   │   └── LanguageSwitcher.tsx
│   ├── i18n/
│   │   ├── index.ts
│   │   ├── context.tsx
│   │   └── translations.ts
│   ├── App.tsx
│   ├── index.tsx
│   └── index.css
├── public/
│   └── logo.png
├── index.html
├── vite.config.ts
├── wrangler.toml
└── package.json
```
