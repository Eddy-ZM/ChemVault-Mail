import SwiftUI
#if os(macOS)
import AppKit
#else
import UIKit
#endif

struct ComposeView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appEnvironment: AppEnvironment
    @State private var accounts: [ChemVaultAccount] = []
    @State private var selectedAccountId: Int?
    @State private var to = ""
    @State private var cc = ""
    @State private var bcc = ""
    @State private var subject = ""
    @State private var bodyAttributedText = NSAttributedString(string: "")
    @State private var formattingCommand: ComposeRichTextCommand?
    @State private var isSending = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("From") {
                    Picker("Account", selection: $selectedAccountId) {
                        ForEach(accounts) { account in
                            Text(account.displayName).tag(Optional(account.accountId))
                        }
                    }
                }

                Section("Recipients") {
                    TextField("To", text: $to)
                    TextField("Cc", text: $cc)
                    TextField("Bcc", text: $bcc)
                }

                Section("Message") {
                    TextField("Subject", text: $subject)
                    ComposeFormattingToolbar(command: $formattingCommand)
                    RichTextEditor(text: $bodyAttributedText, command: $formattingCommand)
                        .frame(minHeight: 360)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Compose")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        send()
                    } label: {
                        if isSending {
                            ProgressView()
                        } else {
                            Text("Send")
                        }
                    }
                    .disabled(selectedAccountId == nil || to.emailList.isEmpty || isSending)
                }
            }
            .task {
                await loadAccounts()
            }
        }
    }

    private func loadAccounts() async {
        do {
            accounts = try await appEnvironment.apiClient.accounts()
            selectedAccountId = selectedAccountId ?? accounts.first?.accountId
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func send() {
        guard let accountId = selectedAccountId else { return }
        isSending = true
        errorMessage = nil
        let plainText = bodyAttributedText.string
        let html = ComposeRichText.html(from: bodyAttributedText)
        let request = ComposeEmailRequest(
            accountId: accountId,
            name: nil,
            sendType: "send",
            emailId: nil,
            receiveEmail: to.emailList,
            text: plainText,
            content: html,
            subject: subject,
            attachments: []
        )
        Task {
            do {
                _ = try await appEnvironment.apiClient.sendEmail(request)
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }
            isSending = false
        }
    }
}

enum ComposeTextFormat: Hashable {
    case bold
    case italic
    case underline
}

enum ComposeRichTextAction: Hashable {
    case toggle(ComposeTextFormat)
    case unorderedList
    case orderedList
}

struct ComposeRichTextCommand: Equatable {
    let id = UUID()
    let action: ComposeRichTextAction
}

struct ComposeFormattingToolbar: View {
    @Binding var command: ComposeRichTextCommand?

    var body: some View {
        HStack(spacing: 6) {
            formatButton("Bold", systemImage: "bold", action: .toggle(.bold))
            formatButton("Italic", systemImage: "italic", action: .toggle(.italic))
            formatButton("Underline", systemImage: "underline", action: .toggle(.underline))
            Divider()
                .frame(height: 24)
            formatButton("Bulleted list", systemImage: "list.bullet", action: .unorderedList)
            formatButton("Numbered list", systemImage: "list.number", action: .orderedList)
            Spacer(minLength: 0)
        }
        .buttonStyle(.bordered)
        .controlSize(.small)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Formatting toolbar")
    }

    private func formatButton(_ title: String, systemImage: String, action: ComposeRichTextAction) -> some View {
        Button {
            command = ComposeRichTextCommand(action: action)
        } label: {
            Image(systemName: systemImage)
                .frame(width: 18, height: 18)
        }
        .help(title)
        .accessibilityLabel(title)
    }
}

enum ComposeRichText {
    static func html(from attributedText: NSAttributedString) -> String {
        let fullRange = NSRange(location: 0, length: attributedText.length)
        var body = ""

        attributedText.enumerateAttributes(in: fullRange) { attributes, range, _ in
            let text = (attributedText.string as NSString).substring(with: range)
            body += runHTML(text, formats: formats(from: attributes))
        }

        return "<p>\(body)</p>"
    }

    static func runHTML(_ text: String, formats: Set<ComposeTextFormat>) -> String {
        var result = escape(text).replacingOccurrences(of: "\n", with: "<br>")

        if formats.contains(.underline) {
            result = "<u>\(result)</u>"
        }

        if formats.contains(.italic) {
            result = "<em>\(result)</em>"
        }

        if formats.contains(.bold) {
            result = "<strong>\(result)</strong>"
        }

        return result
    }

    static func apply(_ action: ComposeRichTextAction, to attributedText: NSMutableAttributedString, selectedRange: NSRange, typingAttributes: inout [NSAttributedString.Key: Any]) {
        switch action {
        case .toggle(let format):
            if selectedRange.length == 0 {
                typingAttributes = toggledAttributes(typingAttributes, format: format)
            } else {
                let snapshot = NSAttributedString(attributedString: attributedText)
                snapshot.enumerateAttributes(in: selectedRange) { attributes, range, _ in
                    attributedText.setAttributes(toggledAttributes(attributes, format: format), range: range)
                }
            }
        case .unorderedList:
            insertListMarker("• ", into: attributedText, selectedRange: selectedRange)
        case .orderedList:
            insertListMarker("1. ", into: attributedText, selectedRange: selectedRange)
        }
    }

    private static func insertListMarker(_ marker: String, into attributedText: NSMutableAttributedString, selectedRange: NSRange) {
        let location = min(selectedRange.location, attributedText.length)
        let lineStart = (attributedText.string as NSString).lineRange(for: NSRange(location: location, length: 0)).location
        attributedText.insert(NSAttributedString(string: marker), at: lineStart)
    }

    private static func formats(from attributes: [NSAttributedString.Key: Any]) -> Set<ComposeTextFormat> {
        var formats = Set<ComposeTextFormat>()

        if let underlineStyle = attributes[.underlineStyle] as? Int, underlineStyle != 0 {
            formats.insert(.underline)
        }

        #if os(macOS)
        if let font = attributes[.font] as? NSFont {
            if font.fontDescriptor.symbolicTraits.contains(.bold) {
                formats.insert(.bold)
            }
            if font.fontDescriptor.symbolicTraits.contains(.italic) {
                formats.insert(.italic)
            }
        }
        #else
        if let font = attributes[.font] as? UIFont {
            if font.fontDescriptor.symbolicTraits.contains(.traitBold) {
                formats.insert(.bold)
            }
            if font.fontDescriptor.symbolicTraits.contains(.traitItalic) {
                formats.insert(.italic)
            }
        }
        #endif

        return formats
    }

    private static func toggledAttributes(_ attributes: [NSAttributedString.Key: Any], format: ComposeTextFormat) -> [NSAttributedString.Key: Any] {
        var updated = attributes

        switch format {
        case .bold:
            updated[.font] = toggledFont(attributes[.font], format: .bold)
        case .italic:
            updated[.font] = toggledFont(attributes[.font], format: .italic)
        case .underline:
            let current = updated[.underlineStyle] as? Int ?? 0
            updated[.underlineStyle] = current == 0 ? NSUnderlineStyle.single.rawValue : 0
        }

        return updated
    }

    private static func escape(_ text: String) -> String {
        text
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
    }

    #if os(macOS)
    private static func toggledFont(_ value: Any?, format: ComposeTextFormat) -> NSFont {
        let font = value as? NSFont ?? NSFont.systemFont(ofSize: NSFont.systemFontSize)
        let manager = NSFontManager.shared

        switch format {
        case .bold:
            return font.fontDescriptor.symbolicTraits.contains(.bold)
                ? manager.convert(font, toNotHaveTrait: .boldFontMask)
                : manager.convert(font, toHaveTrait: .boldFontMask)
        case .italic:
            return font.fontDescriptor.symbolicTraits.contains(.italic)
                ? manager.convert(font, toNotHaveTrait: .italicFontMask)
                : manager.convert(font, toHaveTrait: .italicFontMask)
        case .underline:
            return font
        }
    }
    #else
    private static func toggledFont(_ value: Any?, format: ComposeTextFormat) -> UIFont {
        let font = value as? UIFont ?? UIFont.preferredFont(forTextStyle: .body)
        var traits = font.fontDescriptor.symbolicTraits

        switch format {
        case .bold:
            if traits.contains(.traitBold) {
                traits.remove(.traitBold)
            } else {
                traits.insert(.traitBold)
            }
        case .italic:
            if traits.contains(.traitItalic) {
                traits.remove(.traitItalic)
            } else {
                traits.insert(.traitItalic)
            }
        case .underline:
            return font
        }

        guard let descriptor = font.fontDescriptor.withSymbolicTraits(traits) else {
            return font
        }

        return UIFont(descriptor: descriptor, size: font.pointSize)
    }
    #endif
}

#if os(macOS)
struct RichTextEditor: NSViewRepresentable {
    @Binding var text: NSAttributedString
    @Binding var command: ComposeRichTextCommand?

    func makeCoordinator() -> Coordinator {
        Coordinator(text: $text)
    }

    func makeNSView(context: Context) -> NSScrollView {
        let scrollView = NSScrollView()
        let textView = NSTextView()

        textView.isRichText = true
        textView.allowsUndo = true
        textView.font = NSFont.systemFont(ofSize: NSFont.systemFontSize)
        textView.delegate = context.coordinator
        textView.textContainerInset = NSSize(width: 10, height: 10)
        scrollView.hasVerticalScroller = true
        scrollView.documentView = textView
        context.coordinator.textView = textView

        return scrollView
    }

    func updateNSView(_ nsView: NSScrollView, context: Context) {
        guard let textView = nsView.documentView as? NSTextView else { return }

        if textView.attributedString() != text {
            textView.textStorage?.setAttributedString(text)
        }

        applyPendingCommand(to: textView, context: context)
    }

    private func applyPendingCommand(to textView: NSTextView, context: Context) {
        guard let command, context.coordinator.appliedCommandID != command.id else { return }

        let mutable = NSMutableAttributedString(attributedString: textView.attributedString())
        var typingAttributes = textView.typingAttributes
        let selectedRange = textView.selectedRange()

        ComposeRichText.apply(command.action, to: mutable, selectedRange: selectedRange, typingAttributes: &typingAttributes)
        textView.textStorage?.setAttributedString(mutable)
        textView.setSelectedRange(selectedRange)
        textView.typingAttributes = typingAttributes
        text = mutable
        context.coordinator.appliedCommandID = command.id
    }

    final class Coordinator: NSObject, NSTextViewDelegate {
        @Binding var text: NSAttributedString
        var appliedCommandID: UUID?
        weak var textView: NSTextView?

        init(text: Binding<NSAttributedString>) {
            _text = text
        }

        func textDidChange(_ notification: Notification) {
            guard let textView = notification.object as? NSTextView else { return }
            text = textView.attributedString()
        }
    }
}
#else
struct RichTextEditor: UIViewRepresentable {
    @Binding var text: NSAttributedString
    @Binding var command: ComposeRichTextCommand?

    func makeCoordinator() -> Coordinator {
        Coordinator(text: $text)
    }

    func makeUIView(context: Context) -> UITextView {
        let textView = UITextView()
        textView.delegate = context.coordinator
        textView.font = UIFont.preferredFont(forTextStyle: .body)
        textView.adjustsFontForContentSizeCategory = true
        textView.allowsEditingTextAttributes = true
        textView.backgroundColor = .clear
        textView.textContainerInset = UIEdgeInsets(top: 10, left: 8, bottom: 10, right: 8)
        textView.layer.borderWidth = 1
        textView.layer.cornerRadius = 8
        textView.layer.borderColor = UIColor.separator.cgColor
        return textView
    }

    func updateUIView(_ uiView: UITextView, context: Context) {
        if uiView.attributedText != text {
            uiView.attributedText = text
        }

        applyPendingCommand(to: uiView, context: context)
    }

    private func applyPendingCommand(to textView: UITextView, context: Context) {
        guard let command, context.coordinator.appliedCommandID != command.id else { return }

        let mutable = NSMutableAttributedString(attributedString: textView.attributedText ?? NSAttributedString(string: ""))
        var typingAttributes = textView.typingAttributes
        let selectedRange = textView.selectedRange

        ComposeRichText.apply(command.action, to: mutable, selectedRange: selectedRange, typingAttributes: &typingAttributes)
        textView.attributedText = mutable
        textView.selectedRange = selectedRange
        textView.typingAttributes = typingAttributes
        text = mutable
        context.coordinator.appliedCommandID = command.id
    }

    final class Coordinator: NSObject, UITextViewDelegate {
        @Binding var text: NSAttributedString
        var appliedCommandID: UUID?

        init(text: Binding<NSAttributedString>) {
            _text = text
        }

        func textViewDidChange(_ textView: UITextView) {
            text = textView.attributedText ?? NSAttributedString(string: "")
        }
    }
}
#endif

extension String {
    var emailList: [String] {
        split { character in
            character == "," || character == ";" || character == "\n" || character == " "
        }
        .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
        .filter { !$0.isEmpty }
    }
}
