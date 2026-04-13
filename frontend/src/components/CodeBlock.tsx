import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface CodeBlockProps {
  code: string;
  language: string;
}

const CodeBlock = ({ code, language }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    Haptics.impact({ style: ImpactStyle.Medium });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-devil-gold/20 bg-black/40 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-2 bg-devil-gold/10 border-b border-devil-gold/10">
        <span className="text-xs font-mono text-devil-gold uppercase tracking-widest">{language}</span>
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-devil-gold/20 rounded-md transition-all text-devil-gold"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <div className="max-h-[400px] overflow-auto">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '0.875rem',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default CodeBlock;
