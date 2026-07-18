import React from 'react';

export const parseInlineMarkdown = (text: string): React.ReactNode[] | string => {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
  let match;
  let lastIndex = 0;
  
  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    const matchText = match[0];
    
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }
    
    if (matchText.startsWith('**') && matchText.endsWith('**')) {
      parts.push(<strong key={matchIndex} style={{ fontWeight: 700 }}>{matchText.slice(2, -2)}</strong>);
    } else if (matchText.startsWith('*') && matchText.endsWith('*')) {
      parts.push(<em key={matchIndex} style={{ fontStyle: 'italic' }}>{matchText.slice(1, -1)}</em>);
    }
    
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
};

export const renderMarkdown = (text: string): React.ReactNode => {
  if (!text) return null;
  const blocks = text.split('\n\n');
  return (
    <>
      {blocks.map((block, blockIdx) => {
        // Bulleted lists
        if (block.startsWith('- ') || block.startsWith('* ') || block.startsWith('• ')) {
          const items = block.split('\n').map(line => line.replace(/^[-*•]\s+/, ''));
          return (
            <ul key={blockIdx} style={{ margin: '8px 0 8px 20px', paddingLeft: 0, listStyleType: 'disc' }}>
              {items.map((item, itemIdx) => (
                <li key={itemIdx} style={{ marginBottom: '4px' }}>
                  {parseInlineMarkdown(item)}
                </li>
              ))}
            </ul>
          );
        }

        // Numbered lists
        if (/^\d+\.\s+/.test(block)) {
          const items = block.split('\n').map(line => line.replace(/^\d+\.\s+/, ''));
          return (
            <ol key={blockIdx} style={{ margin: '8px 0 8px 20px', paddingLeft: 0 }}>
              {items.map((item, itemIdx) => (
                <li key={itemIdx} style={{ marginBottom: '4px' }}>
                  {parseInlineMarkdown(item)}
                </li>
              ))}
            </ol>
          );
        }

        // Headers
        if (block.startsWith('### ')) {
          return (
            <h5 key={blockIdx} style={{ fontSize: '1rem', fontWeight: 600, margin: '12px 0 6px 0', color: 'var(--text-primary)' }}>
              {parseInlineMarkdown(block.substring(4))}
            </h5>
          );
        }
        if (block.startsWith('## ')) {
          return (
            <h4 key={blockIdx} style={{ fontSize: '1.1rem', fontWeight: 600, margin: '14px 0 8px 0', color: 'var(--text-primary)' }}>
              {parseInlineMarkdown(block.substring(3))}
            </h4>
          );
        }
        if (block.startsWith('# ')) {
          return (
            <h3 key={blockIdx} style={{ fontSize: '1.2rem', fontWeight: 700, margin: '16px 0 10px 0', color: 'var(--text-primary)' }}>
              {parseInlineMarkdown(block.substring(2))}
            </h3>
          );
        }

        // Standard paragraph
        return (
          <p key={blockIdx} style={{ margin: '8px 0' }}>
            {parseInlineMarkdown(block)}
          </p>
        );
      })}
    </>
  );
};
