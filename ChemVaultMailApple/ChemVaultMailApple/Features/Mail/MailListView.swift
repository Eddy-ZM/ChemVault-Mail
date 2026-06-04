import SwiftUI

struct MailListView: View {
    let mode: MailboxMode

    @EnvironmentObject private var appEnvironment: AppEnvironment
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @StateObject private var store = MailStore()
    @State private var showingCompose = false

    var body: some View {
        Group {
            #if os(macOS)
            splitLayout
            #else
            if horizontalSizeClass == .compact {
                compactLayout
            } else {
                splitLayout
            }
            #endif
        }
        .sheet(isPresented: $showingCompose) {
            ComposeView()
                .environmentObject(appEnvironment)
        }
        .task {
            await store.load(mode: mode, apiClient: appEnvironment.apiClient)
        }
        .onReceive(NotificationCenter.default.publisher(for: .chemVaultRefreshRequested)) { _ in
            Task { await store.load(mode: mode, apiClient: appEnvironment.apiClient) }
        }
    }

    private var splitLayout: some View {
        NavigationSplitView {
            mailList
        } detail: {
            if let selectedEmail = store.selectedEmail {
                detailView(for: selectedEmail)
            } else {
                ContentUnavailableView("Select a message", systemImage: "envelope.open")
            }
        }
    }

    private var compactLayout: some View {
        mailList
    }

    private var mailList: some View {
        List {
            if store.isLoading && store.emails.isEmpty {
                ProgressView()
            }

            ForEach(store.emails) { email in
                row(for: email)
            }
        }
        .overlay {
            if store.emails.isEmpty && !store.isLoading {
                ContentUnavailableView(
                    mode.title,
                    systemImage: mode == .inbox ? "tray" : "star",
                    description: Text(store.errorMessage ?? "No messages to show.")
                )
            }
        }
        .navigationTitle(mode.title)
        .toolbar {
            ToolbarItemGroup {
                Button {
                    Task { await store.load(mode: mode, apiClient: appEnvironment.apiClient) }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }

                Button {
                    showingCompose = true
                } label: {
                    Label("Compose", systemImage: "square.and.pencil")
                }
            }
        }
    }

    @ViewBuilder
    private func row(for email: ChemVaultEmail) -> some View {
        #if os(macOS)
        selectableRow(for: email)
        #else
        if horizontalSizeClass == .compact {
            NavigationLink {
                detailView(for: email)
            } label: {
                MailRowView(email: email)
            }
            .contextMenu {
                compactRowActions(for: email)
            }
        } else {
            selectableRow(for: email)
        }
        #endif
    }

    private func selectableRow(for email: ChemVaultEmail) -> some View {
        Button {
            store.selectedEmail = email
        } label: {
            MailRowView(email: email)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .listRowBackground(store.selectedEmail?.emailId == email.emailId ? Color.accentColor.opacity(0.12) : Color.clear)
        .contextMenu {
            compactRowActions(for: email)
        }
    }

    @ViewBuilder
    private func compactRowActions(for email: ChemVaultEmail) -> some View {
        Button("Mark Read") {
            Task { await store.markRead(email: email, apiClient: appEnvironment.apiClient) }
        }
        Button(email.starred ? "Unstar" : "Star") {
            Task { await store.toggleStar(email: email, apiClient: appEnvironment.apiClient) }
        }
        Button("Delete", role: .destructive) {
            Task { await store.delete(email: email, apiClient: appEnvironment.apiClient) }
        }
    }

    private func detailView(for email: ChemVaultEmail) -> some View {
        MailDetailView(
            email: email,
            markRead: { Task { await store.markRead(email: email, apiClient: appEnvironment.apiClient) } },
            delete: { Task { await store.delete(email: email, apiClient: appEnvironment.apiClient) } },
            toggleStar: { Task { await store.toggleStar(email: email, apiClient: appEnvironment.apiClient) } }
        )
    }
}

struct MailRowView: View {
    let email: ChemVaultEmail

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Text(email.senderLine)
                    .font(.headline)
                    .lineLimit(1)
                Spacer()
                if email.starred {
                    Image(systemName: "star.fill")
                        .foregroundStyle(.yellow)
                }
            }

            Text(email.title)
                .font(email.isUnread ? .subheadline.weight(.semibold) : .subheadline)
                .lineLimit(1)

            if !email.previewText.isEmpty {
                Text(email.previewText)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            if let createTime = email.createTime {
                Text(createTime)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 6)
    }
}
