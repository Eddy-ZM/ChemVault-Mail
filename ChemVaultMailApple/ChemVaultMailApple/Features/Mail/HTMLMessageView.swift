import Foundation
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
        let messageHTML = bodyContent(from: html)

        return """
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

            #chemvault-message-inner {
              box-sizing: border-box;
              width: 100%;
              max-width: 100%;
              transform-origin: top left;
            }

            #chemvault-message-inner.chemvault-scaled-email {
              max-width: none;
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
              table-layout: auto;
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
        <body>
          <div id="chemvault-message-root">
            <div id="chemvault-message-inner">\(messageHTML)</div>
          </div>
          <script>
            (function () {
              function declaredWidth(element) {
                var width = element.getAttribute("width");
                if (width && /^[0-9.]+$/.test(width)) {
                  return parseFloat(width);
                }

                var inlineWidth = element.style && element.style.width;
                if (inlineWidth && inlineWidth.indexOf("px") !== -1) {
                  return parseFloat(inlineWidth);
                }

                return 0;
              }

              function widestTable(root) {
                var tables = root.querySelectorAll("table");
                var width = 0;
                for (var index = 0; index < tables.length; index += 1) {
                  width = Math.max(width, declaredWidth(tables[index]), tables[index].scrollWidth, tables[index].offsetWidth);
                }
                return width;
              }

              function fitMessage() {
                var root = document.getElementById("chemvault-message-root");
                var inner = document.getElementById("chemvault-message-inner");
                if (!root || !inner) {
                  return;
                }

                inner.classList.remove("chemvault-scaled-email");
                inner.style.transform = "none";
                inner.style.width = "100%";
                root.style.height = "";

                var viewportWidth = root.clientWidth || document.documentElement.clientWidth || window.innerWidth;
                var contentWidth = Math.max(widestTable(inner), inner.scrollWidth, inner.offsetWidth);

                if (viewportWidth > 0 && contentWidth > viewportWidth + 1) {
                  var scale = Math.min(1, viewportWidth / contentWidth);
                  inner.classList.add("chemvault-scaled-email");
                  inner.style.width = contentWidth + "px";
                  inner.style.transform = "scale(" + scale + ")";
                  root.style.height = Math.ceil(inner.scrollHeight * scale) + "px";
                }
              }

              window.addEventListener("load", fitMessage);
              window.addEventListener("resize", fitMessage);
              setTimeout(fitMessage, 50);
              setTimeout(fitMessage, 300);
              setTimeout(fitMessage, 1000);
            }());
          </script>
        </body>
        </html>
        """
    }

    private static func bodyContent(from html: String) -> String {
        if let bodyRegex = try? NSRegularExpression(pattern: #"<body\b[^>]*>([\s\S]*?)</body>"#, options: [.caseInsensitive]),
           let match = bodyRegex.firstMatch(in: html, range: NSRange(html.startIndex..<html.endIndex, in: html)),
           let bodyRange = Range(match.range(at: 1), in: html) {
            return String(html[bodyRange])
        }

        return html
            .replacingOccurrences(of: #"(?is)<!doctype[^>]*>"#, with: "", options: .regularExpression)
            .replacingOccurrences(of: #"(?is)<meta\b[^>]*name=["']?viewport["']?[^>]*>"#, with: "", options: .regularExpression)
            .replacingOccurrences(of: #"(?is)</?(html|head|body)\b[^>]*>"#, with: "", options: .regularExpression)
    }
}
