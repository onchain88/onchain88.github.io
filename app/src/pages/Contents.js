import { marked } from 'marked';

export async function ContentsPage(path) {
  try {
    // パスを整形（contents/が重複しないように）
    const cleanPath = path.replace(/^\//, '').replace(/^contents\//, '');
    const mdPath = `/contents/${cleanPath}.md`;
    
    const response = await fetch(mdPath);
    
    if (!response.ok) {
      return `
        <div class="page contents-page">
          <div class="markdown-content">
            <h1>404 - ページが見つかりません</h1>
            <p>指定されたページ "${cleanPath}" は存在しません。</p>
            <p><a href="#home">ホームに戻る</a></p>
          </div>
        </div>
      `;
    }
    
    const markdown = await response.text();
    const html = marked(markdown);
    
    return `
      <div class="page contents-page">
        <div class="markdown-content">
          ${html}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Failed to load content:', error);
    return `
      <div class="page contents-page">
        <div class="markdown-content">
          <h1>エラー</h1>
          <p>コンテンツの読み込みに失敗しました。</p>
          <p><a href="#home">ホームに戻る</a></p>
        </div>
      </div>
    `;
  }
}