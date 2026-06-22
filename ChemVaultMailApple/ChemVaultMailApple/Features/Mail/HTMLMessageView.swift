import SwiftUI
import WebKit

#if os(macOS)
struct HTMLMessageView: NSViewRepresentable {
    let html: String

    func makeNSView(context: Context) -> WKWebView {
        let view = WKWebView()
        view.allowsMagnification = true
        view.setValue(false, forKey: "drawsBackground")
        return view
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {
        nsView.loadHTMLString(wrappedHTML, baseURL: nil)
    }

    private var wrappedHTML: String {
        HTMLMessageDocument.wrap(html)
    }
}
#else
struct HTMLMessageView: UIViewRepresentable {
    let html: String

    func makeUIView(context: Context) -> WKWebView {
        let view = WKWebView()
        view.isOpaque = false
        view.backgroundColor = .clear
        view.scrollView.backgroundColor = .clear
        view.scrollView.alwaysBounceVertical = true
        view.scrollView.contentInsetAdjustmentBehavior = .never
        return view
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        uiView.loadHTMLString(wrappedHTML, baseURL: nil)
    }

    private var wrappedHTML: String {
        HTMLMessageDocument.wrap(html)
    }
}
#endif

enum HTMLMessageDocument {
    static func wrap(_ html: String) -> String {
        """
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
          <style>
            :root {
              color-scheme: light dark;
              font: -apple-system-body;
              -webkit-text-size-adjust: 100%;
            }

            html,
            body {
              min-height: 100%;
              margin: 0;
              padding: 0;
              color: CanvasText;
              background: transparent;
              overflow-wrap: anywhere;
              word-break: break-word;
            }

            body {
              font: -apple-system-body;
              line-height: 1.48;
              padding-bottom: 24px;
            }

            img,
            video,
            canvas,
            svg {
              max-width: 100%;
              height: auto;
            }

            table,
            pre,
            code {
              max-width: 100%;
            }

            table,
            pre {
              display: block;
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
            }

            pre {
              white-space: pre-wrap;
            }

            blockquote {
              margin-left: 0;
              padding-left: 12px;
              border-left: 3px solid rgba(128, 128, 128, 0.35);
            }
          </style>
        </head>
        <body>\(html)</body>
        </html>
        """
    }
}
