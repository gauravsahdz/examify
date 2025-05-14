
'use client'; // Ensure this runs on the client

import React from 'react';
import dynamic from 'next/dynamic';
import 'ace-builds/src-noconflict/ace';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/mode-csharp';
import 'ace-builds/src-noconflict/mode-c_cpp';
import 'ace-builds/src-noconflict/theme-github'; // Default theme
import 'ace-builds/src-noconflict/theme-monokai'; // Add more themes if needed
import 'ace-builds/src-noconflict/ext-language_tools'; // For autocompletion
import 'ace-builds/src-noconflict/ext-searchbox'; // For search functionality

// Dynamically import AceEditor to avoid SSR issues
const AceEditor = dynamic(
  async () => {
    const ace = await import('react-ace');
    // Import modes and themes dynamically if needed for specific configurations
    // e.g., await import('ace-builds/src-noconflict/mode-yourlanguage');
    return ace;
  },
  {
    ssr: false, // Important: disable SSR for this component
    loading: () => <div className="flex h-[200px] w-full items-center justify-center rounded-md border bg-muted text-sm">Loading Editor...</div>, // Optional loading state
  }
);

interface CodeEditorProps {
  mode?: string;
  theme?: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  height?: string;
  width?: string;
  readOnly?: boolean;
  fontSize?: number;
  showGutter?: boolean;
  showPrintMargin?: boolean;
  highlightActiveLine?: boolean;
  setOptions?: {
    enableBasicAutocompletion?: boolean;
    enableLiveAutocompletion?: boolean;
    enableSnippets?: boolean;
    showLineNumbers?: boolean;
    tabSize?: number;
    [key: string]: any; // Allow additional Ace options
  };
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  mode = 'javascript',
  theme = 'github',
  value,
  onChange,
  placeholder = '',
  height = '400px',
  width = '100%',
  readOnly = false,
  fontSize = 14,
  showGutter = true,
  showPrintMargin = false,
  highlightActiveLine = true,
  setOptions = {},
}) => {
  return (
    <div className="rounded-md border overflow-hidden">
      <AceEditor
        mode={mode}
        theme={theme}
        value={value}
        onChange={onChange}
        name={`code-editor-${Math.random().toString(16).slice(2)}`} // Unique name
        editorProps={{ $blockScrolling: true }}
        height={height}
        width={width}
        readOnly={readOnly}
        fontSize={fontSize}
        showGutter={showGutter}
        showPrintMargin={showPrintMargin}
        highlightActiveLine={highlightActiveLine}
        placeholder={placeholder}
        setOptions={{
          useWorker: false, // Disable worker to avoid potential issues in some environments
          enableBasicAutocompletion: true,
          enableLiveAutocompletion: true,
          enableSnippets: true,
          showLineNumbers: true,
          tabSize: 2,
          ...setOptions, // Merge custom options
        }}
        className="font-mono" // Apply font-mono for consistent code look
      />
    </div>
  );
};

export default CodeEditor;
