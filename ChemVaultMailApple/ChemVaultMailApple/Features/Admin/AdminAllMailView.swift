import Foundation
import SwiftUI

struct AdminAllMailView: View {
    @EnvironmentObject private var appEnvironment: AppEnvironment
    @State private var emails: [ChemVaultEmail] = []
    @State private var total: Int?
    @State private var searchText = ""
    @State private var searchType: AdminAllMailSearchType = .sender
    @State private var typeFilter: AdminAllMailTypeFilter = .received
    @State private var timeSort = 0
    @State private var pageSize = 30
    @State private var canLoadMore = false
    @State private var isLoading = false
    @State private var isMutating = false
    @State private var errorMessage: String?
    @State private var statusMessage: String?
    @State private var selectedEmail: ChemVaultEmail?
    @State private var batchDeleteDraft: AdminAllMailBatchDeleteDraft?
    @State private var confirmation: AdminAllMailConfirmation?

    var body: some View {
        ZStack {
            ChemVaultWorkspaceBackground()

            ScrollView {
                LazyVStack(spacing: 12) {
                    filters

                    if let statusMessage {
                        AdminAllMailNotice(message: statusMessage, systemImage: "checkmark.circle.fill", color: .green)
                    }

                    if let errorMessage {
                        AdminAllMailNotice(message: errorMessage, systemImage: "exclamationmark.triangle.fill", color: .red)
                    }

                    AdminAllMailSummaryCard(
                        visible: emails.count,
                        total: total,
                        filter: typeFilter.title,
                        isLoading: isLoading
                    )

                    if isLoading && emails.isEmpty {
                        ChemVaultLoadingView(title: "All Mail", subtitle: "Loading system messages", size: 34, presentation: .card)
                    } else if emails.isEmpty && errorMessage == nil {
                        ContentUnavailableView("All Mail", systemImage: "archivebox", description: Text("No messages match the current filters."))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 36)
                            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    } else {
                        ForEach(emails) { email in
                            Button {
                                selectedEmail = email
                            } label: {
                                AdminAllMailCard(
                                    email: email,
                                    isBusy: isMutating,
                                    delete: { confirmation = .delete(email) }
                                )
                            }
                            .buttonStyle(.plain)
                        }

                        if canLoadMore {
                            Button {
                                Task { await load(reset: false) }
                            } label: {
                                if isLoading {
                                    ChemVaultLoadingButtonLabel(title: "Loading", size: 16)
                                } else {
                                    Label("Load More", systemImage: "chevron.down")
                                }
                            }
                            .buttonStyle(.bordered)
                            .disabled(isLoading || isMutating)
                            .padding(.top, 4)
                        }
                    }
                }
                .padding()
            }
            .refreshable {
                await load(reset: true)
            }

            if isMutating {
                ChemVaultLoadingView(title: "Applying changes", subtitle: "Updating mail storage", size: 34, presentation: .card)
                    .padding()
                    .background(.black.opacity(0.12))
                    .transition(.opacity)
            }
        }
        .navigationTitle("All Mail")
        .toolbar {
            ToolbarItemGroup {
                Button {
                    batchDeleteDraft = AdminAllMailBatchDeleteDraft()
                } label: {
                    Label("Batch Clear", systemImage: "broom")
                }
                .disabled(isLoading || isMutating)

                Button {
                    Task { await load(reset: true) }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
                .disabled(isLoading || isMutating)
            }
        }
        .sheet(item: $selectedEmail) { email in
            AdminAllMailDetailSheet(email: email) { email in
                try await deleteEmail(email)
            }
        }
        .sheet(item: $batchDeleteDraft) { _ in
            AdminAllMailBatchDeleteSheet { request in
                try await batchDelete(request)
            }
        }
        .confirmationDialog(
            confirmation?.title ?? "",
            isPresented: Binding(
                get: { confirmation != nil },
                set: { isPresented in
                    if !isPresented {
                        confirmation = nil
                    }
                }
            ),
            titleVisibility: .visible
        ) {
            if let confirmation {
                switch confirmation {
                case .delete(let email):
                    Button("Delete Permanently", role: .destructive) {
                        mutate { try await deleteEmail(email) }
                    }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(confirmation?.message ?? "")
        }
        .task { await load(reset: true) }
        .onChange(of: typeFilter) {
            Task { await load(reset: true) }
        }
        .onChange(of: pageSize) {
            Task { await load(reset: true) }
        }
        .animation(ChemVaultMotion.routeTransition, value: emails)
        .animation(ChemVaultMotion.depthShift, value: statusMessage)
        .animation(ChemVaultMotion.depthShift, value: errorMessage)
    }

    private var filters: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Picker("Search Type", selection: $searchType) {
                    ForEach(AdminAllMailSearchType.allCases) { type in
                        Label(type.title, systemImage: type.systemImage).tag(type)
                    }
                }
                .labelsHidden()
                .controlSize(.small)

                TextField("Search \(searchType.title.lowercased())", text: $searchText)
                    .textFieldStyle(.plain)
                    .autocorrectionDisabled()
                    .onSubmit { Task { await load(reset: true) } }

                if searchText.nilIfBlank != nil {
                    Button {
                        searchText = ""
                        Task { await load(reset: true) }
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 12)
            .frame(height: 38)
            .background(.background.opacity(0.65), in: RoundedRectangle(cornerRadius: 8, style: .continuous))

            ViewThatFits(in: .horizontal) {
                HStack(spacing: 10) { filterControls }
                VStack(alignment: .leading, spacing: 10) { filterControls }
            }
        }
        .padding(12)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    private var filterControls: some View {
        Group {
            Picker("Type", selection: $typeFilter) {
                ForEach(AdminAllMailTypeFilter.allCases) { filter in
                    Text(filter.title).tag(filter)
                }
            }
            .labelsHidden()
            .controlSize(.small)

            Picker("Page Size", selection: $pageSize) {
                ForEach([20, 30, 50], id: \.self) { size in
                    Text("\(size)").tag(size)
                }
            }
            .labelsHidden()
            .controlSize(.small)

            Button {
                timeSort = timeSort == 0 ? 1 : 0
                Task { await load(reset: true) }
            } label: {
                Label(timeSort == 0 ? "Newest" : "Oldest", systemImage: timeSort == 0 ? "timer" : "timer.circle")
            }
            .buttonStyle(.bordered)
            .controlSize(.small)

            Button {
                Task { await load(reset: true) }
            } label: {
                Label("Search", systemImage: "magnifyingglass")
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.small)
            .disabled(isLoading || isMutating)

            Button {
                resetFilters()
            } label: {
                Label("Reset", systemImage: "arrow.counterclockwise")
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
            .disabled(isLoading || isMutating)
        }
    }

    private func resetFilters() {
        searchText = ""
        searchType = .sender
        typeFilter = .received
        timeSort = 0
        pageSize = 30
        Task { await load(reset: true) }
    }

    private func load(reset: Bool) async {
        isLoading = true
        errorMessage = nil
        do {
            let cursor = reset ? 0 : (emails.last?.emailId ?? 0)
            let response = try await appEnvironment.apiClient.adminAllEmailList(query: queryItems(emailId: cursor))
            if reset {
                emails = response.list
            } else {
                let existingIds = Set(emails.map(\.emailId))
                emails.append(contentsOf: response.list.filter { !existingIds.contains($0.emailId) })
            }
            total = response.total
            canLoadMore = response.list.count >= pageSize
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func queryItems(emailId: Int) -> [URLQueryItem] {
        var items = [
            URLQueryItem(name: "emailId", value: String(emailId)),
            URLQueryItem(name: "size", value: String(pageSize)),
            URLQueryItem(name: "timeSort", value: String(timeSort)),
            URLQueryItem(name: "type", value: typeFilter.apiValue)
        ]

        if let text = searchText.nilIfBlank {
            items.append(URLQueryItem(name: searchType.queryKey, value: text))
        }

        return items
    }

    private func mutate(_ operation: @escaping () async throws -> Void) {
        Task {
            isMutating = true
            errorMessage = nil
            statusMessage = nil
            do {
                try await operation()
            } catch {
                errorMessage = error.localizedDescription
            }
            isMutating = false
        }
    }

    private func deleteEmail(_ email: ChemVaultEmail) async throws {
        try await appEnvironment.apiClient.deleteAdminEmails([email.emailId])
        selectedEmail = nil
        statusMessage = "Message deleted permanently."
        await load(reset: true)
    }

    private func batchDelete(_ request: AllEmailBatchDeleteRequest) async throws {
        try await appEnvironment.apiClient.batchDeleteAdminEmails(request)
        statusMessage = "Matching messages cleared."
        await load(reset: true)
    }
}

private struct AdminAllMailSummaryCard: View {
    var visible: Int
    var total: Int?
    var filter: String
    var isLoading: Bool

    var body: some View {
        HStack(spacing: 12) {
            AdminAllMailMetric(title: "Visible", value: "\(visible)", systemImage: "list.bullet.rectangle")
            Divider()
            AdminAllMailMetric(title: "Total", value: total.map(String.init) ?? "-", systemImage: "archivebox")
            Divider()
            AdminAllMailMetric(title: "Filter", value: filter, systemImage: "line.3.horizontal.decrease.circle")
            Spacer()
            if isLoading {
                ChemVaultLoadingMark(size: 18, showsTrack: false)
            }
        }
        .padding(14)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

private struct AdminAllMailMetric: View {
    var title: String
    var value: String
    var systemImage: String

    var body: some View {
        Label {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text(value)
                    .font(.headline)
                    .lineLimit(1)
            }
        } icon: {
            Image(systemName: systemImage)
                .foregroundStyle(.blue)
        }
    }
}

private struct AdminAllMailCard: View {
    var email: ChemVaultEmail
    var isBusy: Bool
    var delete: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: email.type == 1 ? "paperplane.fill" : "tray.and.arrow.down.fill")
                .font(.title3.weight(.semibold))
                .foregroundStyle(email.isDel == 1 ? .red : .blue)
                .frame(width: 36, height: 36)
                .background((email.isDel == 1 ? Color.red : Color.blue).opacity(0.1), in: RoundedRectangle(cornerRadius: 8, style: .continuous))

            VStack(alignment: .leading, spacing: 7) {
                HStack(spacing: 8) {
                    Text(email.title)
                        .font(.headline)
                        .lineLimit(1)
                    if email.isDel == 1 {
                        AdminAllMailChip(title: "Deleted", systemImage: "trash", color: .red)
                    }
                    if email.status == 3 {
                        AdminAllMailChip(title: "No recipient", systemImage: "person.crop.circle.badge.exclamationmark", color: .orange)
                    }
                    Spacer(minLength: 8)
                    Text(email.createTime ?? "")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Text(email.senderLine)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)

                if !email.previewText.isEmpty {
                    Text(email.previewText)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        AdminAllMailChip(title: email.type == 1 ? "Sent" : "Received", systemImage: email.type == 1 ? "paperplane" : "tray.and.arrow.down", color: .blue)
                        if let userEmail = email.userEmail, !userEmail.isEmpty {
                            AdminAllMailChip(title: userEmail, systemImage: "person", color: .secondary)
                        }
                        if let toEmail = email.toEmail, !toEmail.isEmpty {
                            AdminAllMailChip(title: toEmail, systemImage: "arrow.down.forward", color: .secondary)
                        }
                        if email.attList?.isEmpty == false {
                            AdminAllMailChip(title: "Attachment", systemImage: "paperclip", color: .secondary)
                        }
                    }
                }
            }

            Menu {
                Button(role: .destructive, action: delete) {
                    Label("Delete Permanently", systemImage: "trash")
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .font(.title3)
                    .frame(width: 32, height: 32)
            }
            .disabled(isBusy)
        }
        .padding(14)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(.secondary.opacity(0.12), lineWidth: 1)
        }
    }
}

private struct AdminAllMailChip: View {
    var title: String
    var systemImage: String
    var color: Color

    var body: some View {
        Label(title, systemImage: systemImage)
            .font(.caption.weight(.medium))
            .lineLimit(1)
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(color.opacity(0.12), in: Capsule())
    }
}

private struct AdminAllMailNotice: View {
    var message: String
    var systemImage: String
    var color: Color

    var body: some View {
        Label(message, systemImage: systemImage)
            .font(.subheadline)
            .foregroundStyle(color)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(color.opacity(0.12), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

private struct AdminAllMailDetailSheet: View {
    @Environment(\.dismiss) private var dismiss
    var email: ChemVaultEmail
    var delete: (ChemVaultEmail) async throws -> Void

    @State private var isDeleting = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
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
                        if let userEmail = email.userEmail {
                            Label(userEmail, systemImage: "person")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        if let createTime = email.createTime {
                            Label(createTime, systemImage: "clock")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    Divider()

                    if let html = email.content, !html.isEmpty {
                        HTMLMessageView(html: html)
                            .frame(minHeight: 420)
                    } else if let text = email.text, !text.isEmpty {
                        Text(text)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    } else {
                        ContentUnavailableView("No message body", systemImage: "doc.text")
                    }

                    if let attachments = email.attList, !attachments.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Attachments")
                                .font(.headline)
                            ForEach(attachments) { attachment in
                                AttachmentRowView(attachment: attachment)
                            }
                        }
                    }

                    if let errorMessage {
                        Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(.red)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .navigationTitle("Message")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(role: .destructive) {
                        Task { await deleteMessage() }
                    } label: {
                        if isDeleting {
                            ChemVaultLoadingMark(size: 16, showsTrack: false)
                        } else {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                    .disabled(isDeleting)
                }
            }
        }
    }

    private func deleteMessage() async {
        isDeleting = true
        errorMessage = nil
        do {
            try await delete(email)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isDeleting = false
    }
}

private struct AdminAllMailBatchDeleteDraft: Identifiable {
    var id = UUID()
}

private struct AdminAllMailBatchDeleteSheet: View {
    @Environment(\.dismiss) private var dismiss
    var save: (AllEmailBatchDeleteRequest) async throws -> Void

    @State private var sendName = ""
    @State private var subject = ""
    @State private var sendEmail = ""
    @State private var toEmail = ""
    @State private var matchType = "eq"
    @State private var includeDateRange = false
    @State private var startDate = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
    @State private var endDate = Date()
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Match Fields") {
                    TextField("Sender name", text: $sendName)
                        .autocorrectionDisabled()
                    TextField("Subject", text: $subject)
                        .autocorrectionDisabled()
                    TextField("Sender email", text: $sendEmail)
                        .autocorrectionDisabled()
                    TextField("Recipient email", text: $toEmail)
                        .autocorrectionDisabled()
                    Picker("Match Type", selection: $matchType) {
                        Text("Equal").tag("eq")
                        Text("Leading").tag("left")
                        Text("Include").tag("include")
                    }
                }

                Section("Date Range") {
                    Toggle("Limit by date", isOn: $includeDateRange)
                    if includeDateRange {
                        DatePicker("Start", selection: $startDate)
                        DatePicker("End", selection: $endDate)
                    }
                }

                Section {
                    Label("This permanently removes every message matching the conditions.", systemImage: "exclamationmark.triangle")
                        .foregroundStyle(.orange)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Batch Clear")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(role: .destructive) {
                        Task { await clear() }
                    } label: {
                        if isSaving {
                            ChemVaultLoadingMark(size: 16, showsTrack: false)
                        } else {
                            Text("Clear")
                        }
                    }
                    .disabled(!canSave)
                }
            }
        }
    }

    private var canSave: Bool {
        !isSaving && (
            sendName.nilIfBlank != nil ||
            subject.nilIfBlank != nil ||
            sendEmail.nilIfBlank != nil ||
            toEmail.nilIfBlank != nil ||
            includeDateRange
        )
    }

    private func clear() async {
        isSaving = true
        errorMessage = nil
        do {
            let request = AllEmailBatchDeleteRequest(
                sendName: sendName.trimmingCharacters(in: .whitespacesAndNewlines),
                sendEmail: sendEmail.trimmingCharacters(in: .whitespacesAndNewlines),
                toEmail: toEmail.trimmingCharacters(in: .whitespacesAndNewlines),
                subject: subject.trimmingCharacters(in: .whitespacesAndNewlines),
                startTime: includeDateRange ? Self.apiDateFormatter.string(from: startDate) : "",
                endTime: includeDateRange ? Self.apiDateFormatter.string(from: endDate) : "",
                type: matchType
            )
            try await save(request)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }

    private static let apiDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        return formatter
    }()
}

private enum AdminAllMailSearchType: String, CaseIterable, Identifiable {
    case sender
    case subject
    case user
    case account

    var id: String { rawValue }

    var title: String {
        switch self {
        case .sender: return "Sender"
        case .subject: return "Subject"
        case .user: return "User"
        case .account: return "Mailbox"
        }
    }

    var systemImage: String {
        switch self {
        case .sender: return "person.text.rectangle"
        case .subject: return "textformat"
        case .user: return "person"
        case .account: return "envelope"
        }
    }

    var queryKey: String {
        switch self {
        case .sender: return "name"
        case .subject: return "subject"
        case .user: return "userEmail"
        case .account: return "accountEmail"
        }
    }
}

private enum AdminAllMailTypeFilter: String, CaseIterable, Identifiable {
    case all
    case received
    case sent
    case deleted
    case noRecipient

    var id: String { rawValue }

    var title: String {
        switch self {
        case .all: return "All"
        case .received: return "Received"
        case .sent: return "Sent"
        case .deleted: return "Deleted"
        case .noRecipient: return "No Recipient"
        }
    }

    var apiValue: String {
        switch self {
        case .all: return "all"
        case .received: return "receive"
        case .sent: return "send"
        case .deleted: return "delete"
        case .noRecipient: return "noone"
        }
    }
}

private enum AdminAllMailConfirmation: Identifiable {
    case delete(ChemVaultEmail)

    var id: String {
        switch self {
        case .delete(let email): return "delete-\(email.emailId)"
        }
    }

    var title: String { "Delete Message" }

    var message: String {
        switch self {
        case .delete(let email): return "Permanently delete \(email.title)?"
        }
    }
}
