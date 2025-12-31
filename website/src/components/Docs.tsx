import { createSignal, createEffect, For, Show } from 'solid-js';
import { marked } from 'marked';
import { useI18n } from '../i18n';

// Import docs as raw strings
import languageMd from '../../../docs/LANGUAGE.md?raw';
import stdlibMd from '../../../docs/STDLIB.md?raw';
import builtinsMd from '../../../docs/BUILTINS.md?raw';
import gettingStartedMd from '../../../docs/GETTING_STARTED.md?raw';
import cliMd from '../../../docs/CLI.md?raw';
import dawIntegrationMd from '../../../docs/daw-integration.md?raw';
import renderingMd from '../../../docs/RENDERING.md?raw';
import schemasMd from '../../../docs/SCHEMAS.md?raw';

interface DocSection {
  id: string;
  title: string;
  titleJa: string;
  content: string;
}

const docs: DocSection[] = [
  { id: 'getting-started', title: 'Getting Started', titleJa: 'はじめに', content: gettingStartedMd },
  { id: 'language', title: 'Language Specification', titleJa: '言語仕様', content: languageMd },
  { id: 'stdlib', title: 'Standard Library', titleJa: '標準ライブラリ', content: stdlibMd },
  { id: 'builtins', title: 'Built-in Functions', titleJa: '組み込み関数', content: builtinsMd },
  { id: 'cli', title: 'CLI Reference', titleJa: 'CLIリファレンス', content: cliMd },
  { id: 'rendering', title: 'Rendering & Plugins', titleJa: 'レンダリング', content: renderingMd },
  { id: 'daw-integration', title: 'DAW Integration', titleJa: 'DAW連携', content: dawIntegrationMd },
  { id: 'schemas', title: 'Schemas', titleJa: 'スキーマ', content: schemasMd },
];

// Configure marked for syntax highlighting hints
marked.setOptions({
  gfm: true,
  breaks: false,
});

export function Docs() {
  const { locale } = useI18n();
  const [activeDoc, setActiveDoc] = createSignal('getting-started');
  const [renderedContent, setRenderedContent] = createSignal('');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [searchResults, setSearchResults] = createSignal<{ id: string; title: string; snippet: string }[]>([]);

  // Render markdown when active doc changes
  createEffect(() => {
    const doc = docs.find(d => d.id === activeDoc());
    if (doc) {
      const html = marked(doc.content) as string;
      setRenderedContent(html);
    }
  });

  // Search functionality
  createEffect(() => {
    const query = searchQuery().toLowerCase().trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const results: { id: string; title: string; snippet: string }[] = [];
    for (const doc of docs) {
      const content = doc.content.toLowerCase();
      const index = content.indexOf(query);
      if (index !== -1) {
        // Extract snippet around the match
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + query.length + 50);
        let snippet = doc.content.substring(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < content.length) snippet = snippet + '...';

        results.push({
          id: doc.id,
          title: locale() === 'ja' ? doc.titleJa : doc.title,
          snippet,
        });
      }
    }
    setSearchResults(results);
  });

  const handleSearchResultClick = (id: string) => {
    setActiveDoc(id);
    setSearchQuery('');
  };

  return (
    <div class="flex h-full bg-gray-900">
      {/* Sidebar */}
      <div class="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Search */}
        <div class="p-4 border-b border-gray-700">
          <input
            type="text"
            placeholder={locale() === 'ja' ? '検索...' : 'Search...'}
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500"
          />

          {/* Search Results Dropdown */}
          <Show when={searchResults().length > 0}>
            <div class="mt-2 bg-gray-700 rounded border border-gray-600 max-h-64 overflow-y-auto">
              <For each={searchResults()}>
                {(result) => (
                  <button
                    onClick={() => handleSearchResultClick(result.id)}
                    class="w-full text-left px-3 py-2 hover:bg-gray-600 border-b border-gray-600 last:border-b-0"
                  >
                    <div class="text-sm text-blue-400">{result.title}</div>
                    <div class="text-xs text-gray-400 truncate">{result.snippet}</div>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Navigation */}
        <nav class="flex-1 overflow-y-auto p-4">
          <ul class="space-y-1">
            <For each={docs}>
              {(doc) => (
                <li>
                  <button
                    onClick={() => setActiveDoc(doc.id)}
                    class={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      activeDoc() === doc.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {locale() === 'ja' ? doc.titleJa : doc.title}
                  </button>
                </li>
              )}
            </For>
          </ul>
        </nav>
      </div>

      {/* Content */}
      <div class="flex-1 overflow-y-auto">
        <article
          class="prose prose-invert prose-lg max-w-4xl mx-auto p-8"
          innerHTML={renderedContent()}
        />
      </div>
    </div>
  );
}
