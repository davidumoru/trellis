import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownProse({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed text-foreground/90">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children, ...rest }) => (
            <h1
              {...rest}
              className="mt-6 mb-2 font-heading text-base font-semibold tracking-tight text-foreground first:mt-0"
            >
              {children}
            </h1>
          ),
          h2: ({ children, ...rest }) => (
            <h2
              {...rest}
              className="mt-6 mb-2 font-heading text-sm font-semibold tracking-tight text-foreground first:mt-0"
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...rest }) => (
            <h3
              {...rest}
              className="mt-4 mb-1.5 text-sm font-semibold text-foreground first:mt-0"
            >
              {children}
            </h3>
          ),
          p: ({ children, ...rest }) => (
            <p {...rest} className="mb-3 last:mb-0">
              {children}
            </p>
          ),
          ul: ({ children, ...rest }) => (
            <ul {...rest} className="mb-3 ml-5 list-disc last:mb-0">
              {children}
            </ul>
          ),
          ol: ({ children, ...rest }) => (
            <ol {...rest} className="mb-3 ml-5 list-decimal last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children, ...rest }) => (
            <li {...rest} className="mb-1 last:mb-0">
              {children}
            </li>
          ),
          a: ({ children, ...rest }) => (
            <a
              {...rest}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-foreground/30 underline-offset-2 transition-colors hover:decoration-foreground"
            >
              {children}
            </a>
          ),
          blockquote: ({ children, ...rest }) => (
            <blockquote
              {...rest}
              className="mb-3 border-l-2 border-border pl-3 text-muted-foreground last:mb-0"
            >
              {children}
            </blockquote>
          ),
          code: ({ children, ...rest }) => (
            <code
              {...rest}
              className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]"
            >
              {children}
            </code>
          ),
          pre: ({ children, ...rest }) => (
            <pre
              {...rest}
              className="mb-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-[12px] last:mb-0"
            >
              {children}
            </pre>
          ),
          strong: ({ children, ...rest }) => (
            <strong {...rest} className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          em: ({ children, ...rest }) => (
            <em {...rest} className="italic">
              {children}
            </em>
          ),
          hr: (props) => <hr {...props} className="my-4 border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
