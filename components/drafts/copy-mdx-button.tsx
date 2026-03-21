'use client';

export function CopyMdxButton({ content }: { content: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(content)}
      className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
    >
      Copy MDX
    </button>
  );
}
