import SwiftUI

struct MailDetailLayout {
    static let minimumMessageBodyHeight: CGFloat = 520
    static let headerReserveHeight: CGFloat = 220

    static func messageBodyMinHeight(containerHeight: CGFloat) -> CGFloat {
        max(minimumMessageBodyHeight, containerHeight - headerReserveHeight)
    }
}

struct MailDetailView: View {
    let email: ChemVaultEmail
    var markRead: () -> Void
    var delete: () -> Void
    var toggleStar: () -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var hasAppeared = false

    var body: some View {
        GeometryReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(email.title)
                            .font(.title2.weight(.semibold))
                            .textSelection(.enabled)

                        Text(email.senderLine)
                            .font(.headline)

                        if let sendEmail = email.sendEmail {
                            Text(sendEmail)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .textSelection(.enabled)
                        }

                        if let createTime = email.createTime {
                            Text(createTime)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .chemVaultEntrance(isVisible: hasAppeared, delay: 0.02, animation: reduceMotion ? nil : ChemVaultMotion.surfaceEntrance)

                    Divider()
                        .opacity(hasAppeared ? 1 : 0)
                        .animation(reduceMotion ? nil : ChemVaultMotion.surfaceEntrance.delay(ChemVaultInteractionConfiguration.staggerStep), value: hasAppeared)

                    if let html = email.content, !html.isEmpty {
                        HTMLMessageView(html: html)
                            .frame(minHeight: MailDetailLayout.messageBodyMinHeight(containerHeight: proxy.size.height))
                            .chemVaultEntrance(isVisible: hasAppeared, delay: ChemVaultInteractionConfiguration.staggerStep * 2, animation: reduceMotion ? nil : ChemVaultMotion.surfaceEntrance)
                    } else if let text = email.text, !text.isEmpty {
                        Text(text)
                            .font(.body)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .chemVaultEntrance(isVisible: hasAppeared, delay: ChemVaultInteractionConfiguration.staggerStep * 2, animation: reduceMotion ? nil : ChemVaultMotion.surfaceEntrance)
                    } else {
                        ContentUnavailableView("No message body", systemImage: "doc.text")
                            .chemVaultEntrance(isVisible: hasAppeared, delay: ChemVaultInteractionConfiguration.staggerStep * 2, animation: reduceMotion ? nil : ChemVaultMotion.surfaceEntrance)
                    }

                    if let attachments = email.attList, !attachments.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Attachments")
                                .font(.headline)
                            ForEach(attachments) { attachment in
                                AttachmentRowView(attachment: attachment)
                            }
                        }
                        .chemVaultEntrance(isVisible: hasAppeared, delay: ChemVaultInteractionConfiguration.staggerStep * 3, animation: reduceMotion ? nil : ChemVaultMotion.surfaceEntrance)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .navigationTitle("Message")
        .toolbar {
            ToolbarItemGroup {
                Button(action: markRead) {
                    Label("Read", systemImage: "envelope.open")
                }
                .disabled(!email.isUnread)
                Button(action: toggleStar) {
                    Label(email.starred ? "Unstar" : "Star", systemImage: email.starred ? "star.slash" : "star")
                }
                Button(role: .destructive, action: delete) {
                    Label("Delete", systemImage: "trash")
                }
            }
        }
        .task(id: email.emailId) {
            hasAppeared = false
            if reduceMotion {
                hasAppeared = true
            } else {
                withAnimation(ChemVaultMotion.surfaceEntrance) {
                    hasAppeared = true
                }
            }
            if email.isUnread {
                markRead()
            }
        }
    }
}

struct AttachmentRowView: View {
    @Environment(\.colorScheme) private var colorScheme
    let attachment: ChemVaultAttachment

    var body: some View {
        HStack {
            Image(systemName: "paperclip")
            VStack(alignment: .leading) {
                Text(attachment.filename ?? attachment.key)
                    .lineLimit(1)
                if let size = attachment.size {
                    Text(ByteCountFormatter.string(fromByteCount: Int64(size), countStyle: .file))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
        }
        .padding(10)
        .background(ChemVaultWorkspaceTheme.panelBackground(for: colorScheme), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(ChemVaultWorkspaceTheme.panelStroke(for: colorScheme), lineWidth: 1)
        }
    }
}
