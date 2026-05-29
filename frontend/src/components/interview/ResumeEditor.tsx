interface Props {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}

export default function ResumeEditor({ value, onChange, readOnly }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs text-gray-500 font-medium">
        Resume / Cover Letter — type or paste your content below
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder="Paste or type your resume, cover letter, or response here…"
        className="flex-1 w-full resize-none p-5 text-sm text-gray-800 leading-relaxed focus:outline-none font-sans"
        style={{ minHeight: 0 }}
      />
    </div>
  );
}
