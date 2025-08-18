import { marked } from 'marked';

export async function HomePage() {
  // マークダウンファイルを取得
  const response = await fetch('/contents/index.md');
  const markdown = await response.text();
  
  // マークダウンをHTMLに変換
  const html = marked(markdown);
  
  return `
    <div class="page home-page">
      <div class="markdown-content">
        ${html}
      </div>
    </div>
  `;
}