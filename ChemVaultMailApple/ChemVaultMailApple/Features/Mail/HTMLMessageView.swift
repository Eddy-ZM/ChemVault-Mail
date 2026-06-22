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
          <meta name="color-scheme" content="light">
          <meta name="supported-color-schemes" content="light">
          <style>
            :root {
              color-scheme: light;
              font: -apple-system-body;
              -webkit-text-size-adjust: 100%;
            }

            html,
            body {
              min-height: 100vh;
              margin: 0;
              padding: 0;
              color: #1f2937;
              background: #ffffff !important;
              overflow-wrap: anywhere;
              word-break: break-word;
            }

            body {
              font: -apple-system-body;
              line-height: 1.48;
            }

            #chemvault-message-root {
              box-sizing: border-box;
              min-height: 100vh;
              width: 100%;
              max-width: 100%;
              overflow-x: hidden;
              background: #ffffff;
              color: #1f2937;
              padding-bottom: 24px;
            }

            img,
            video,
            canvas,
            svg {
              max-width: 100% !important;
              height: auto;
            }

            a,
            td,
            th,
            div,
            p,
            span {
              overflow-wrap: anywhere;
              word-break: break-word;
            }

            table,
            tbody,
            tr,
            td,
            th {
              box-sizing: border-box;
            }

            table {
              max-width: 100% !important;
              table-layout: auto;
            }

            table[width],
            td[width],
            th[width] {
              max-width: 100% !important;
            }

            pre,
            code {
              max-width: 100%;
            }

            pre {
              display: block;
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
              white-space: pre-wrap;
            }

            blockquote {
              margin-left: 0;
              padding-left: 12px;
              border-left: 3px solid rgba(128, 128, 128, 0.35);
            }
          </style>
        </head>
        <body><div id="chemvault-message-root">\(html)</div></body>
        </html>
        """
    }
}
