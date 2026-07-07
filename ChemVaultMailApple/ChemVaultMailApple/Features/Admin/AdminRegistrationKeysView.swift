import Foundation
import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

struct AdminRegistrationKeysView: View {
    @EnvironmentObject private var appEnvironment: AppEnvironment
    @State private var keys: [RegistrationKey] = []
    @State private var roles: [ChemVaultRole] = []
    @State private var searchCode = ""
    @State private var isLoading = false
    @State private var isMutating = false
    @State private var errorMessage: String?
    @State private var statusMessage: String?
    @State private var addDraft: AdminRegistrationKeyAddDraft?
    @State private var historyKey: RegistrationKey?
    @State private var confirmation: AdminRegistrationKeyConfirmation?

    var body: some View {
        ZStack {
            ChemVaultWorkspaceBackground()

            ScrollView {
                LazyVStack(spacing: 12) {
                    searchToolbar

                    if let statusMessage {
                        AdminRegistrationNotice(message: statusMessage, systemImage: "checkmark.circle.fill", color: .green)
                    }

                    if let errorMessage {
                        AdminRegistrationNotice(message: errorMessage, systemImage: "exclamationmark.triangle.fill", color: .red)
                    }

                    AdminRegistrationSummaryCard(total: keys.count, roles: roles.count, isLoading: isLoading)

                    if isLoading && keys.isEmpty {
                        ChemVaultLoadingView(title: "Registration Keys", subtitle: "Loading invite codes", size: 34, presentation: .card)
                    } else if keys.isEmpty && errorMessage == nil {
                        ContentUnavailableView("Registration Keys", systemImage: "ticket", description: Text("No registration keys match the current search."))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 36)
                            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    } else {
                        ForEach(keys) { key in
                            AdminRegistrationKeyCard(
                                key: key,
                                isBusy: isMutating,
                                copyCode: { copyCode(key.code) },
                                showHistory: { historyKey = key },
                                delete: { confirmation = .delete(key) }
                            )
                        }
                    }
                }
                .padding()
            }
            .refreshable {
                await load()
            }

            if isMutating {
                ChemVaultLoadingView(title: "Applying changes", subtitle: "Syncing registration keys", size: 34, presentation: .card)
                    .padding()
                    .background(.black.opacity(0.12))
                    .transition(.opacity)
            }
        }
        .navigationTitle("Registration Keys")
        .toolbar {
            ToolbarItemGroup {
                Button {
                    addDraft = AdminRegistrationKeyAddDraft(defaultRoleId: roles.first?.roleId ?? 0)
                } label: {
                    Label("Add Key", systemImage: "plus")
                }
                .disabled(isLoading || isMutating || roles.isEmpty)

                Button {
                    confirmation = .clearUnused
                } label: {
                    Label("Clear Expired", systemImage: "broom")
                }
                .disabled(isLoading || isMutating)

                Button {
                    Task { await load() }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
                .disabled(isLoading || isMutating)
            }
        }
        .sheet(item: $addDraft) { draft in
            AdminRegistrationKeyAddSheet(draft: draft, roles: roles) { request in
                try await addKey(request)
            }
        }
        .sheet(item: $historyKey) { key in
            AdminRegistrationKeyHistorySheet(key: key)
                .environmentObject(appEnvironment)
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
                case .delete(let key):
                    Button("Delete Key", role: .destructive) {
                        mutate { try await deleteKey(key) }
                    }
                case .clearUnused:
                    Button("Clear Expired and Exhausted", role: .destructive) {
                        mutate { try await clearUnusedKeys() }
                    }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(confirmation?.message ?? "")
        }
        .task { await load() }
        .animation(ChemVaultMotion.routeTransition, value: keys)
        .animation(ChemVaultMotion.depthShift, value: statusMessage)
        .animation(ChemVaultMotion.depthShift, value: errorMessage)
    }

    private var searchToolbar: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField("Search registration key", text: $searchCode)
                    .textFieldStyle(.plain)
                    .autocorrectionDisabled()
                    .onSubmit { Task { await load() } }
                if searchCode.nilIfBlank != nil {
                    Button {
                        searchCode = ""
                        Task { await load() }
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

            HStack(spacing: 10) {
                Button {
                    Task { await load() }
                } label: {
                    Label("Search", systemImage: "magnifyingglass")
                }
                .buttonStyle(.borderedProminent)
                .disabled(isLoading || isMutating)

                Button {
                    searchCode = ""
                    Task { await load() }
                } label: {
                    Label("Reset", systemImage: "arrow.counterclockwise")
                }
                .buttonStyle(.bordered)
                .disabled(isLoading || isMutating)
            }
            .controlSize(.small)
        }
        .padding(12)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        do {
            async let fetchedKeys = appEnvironment.apiClient.adminRegistrationKeys(code: searchCode)
            async let fetchedRoles = appEnvironment.apiClient.adminRoles()
            let (loadedKeys, loadedRoles) = try await (fetchedKeys, fetchedRoles)
            keys = loadedKeys
            roles = loadedRoles
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
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

    private func addKey(_ request: RegistrationKeyAddRequest) async throws {
        try await appEnvironment.apiClient.addRegistrationKey(request)
        statusMessage = "Registration key added."
        await load()
    }

    private func deleteKey(_ key: RegistrationKey) async throws {
        try await appEnvironment.apiClient.deleteRegistrationKeys([key.regKeyId])
        statusMessage = "Registration key deleted."
        await load()
    }

    private func clearUnusedKeys() async throws {
        try await appEnvironment.apiClient.clearUnusedRegistrationKeys()
        statusMessage = "Expired and exhausted keys cleared."
        await load()
    }

    private func copyCode(_ code: String) {
        #if canImport(UIKit)
        UIPasteboard.general.string = code
        #elseif canImport(AppKit)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(code, forType: .string)
        #endif
        statusMessage = "Code copied."
    }
}

private struct AdminRegistrationSummaryCard: View {
    var total: Int
    var roles: Int
    var isLoading: Bool

    var body: some View {
        HStack(spacing: 12) {
            Label {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Keys")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text("\(total)")
                        .font(.headline)
                }
            } icon: {
                Image(systemName: "ticket.fill")
                    .foregroundStyle(.blue)
            }

            Divider()

            Label {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Assignable Roles")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text("\(roles)")
                        .font(.headline)
                }
            } icon: {
                Image(systemName: "key.horizontal")
                    .foregroundStyle(.purple)
            }

            Spacer()

            if isLoading {
                ChemVaultLoadingMark(size: 18, showsTrack: false)
            }
        }
        .padding(14)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

private struct AdminRegistrationKeyCard: View {
    var key: RegistrationKey
    var isBusy: Bool
    var copyCode: () -> Void
    var showHistory: () -> Void
    var delete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: isExpired ? "ticket.fill" : "ticket")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(isExpired || isExhausted ? .red : .blue)
                    .frame(width: 34, height: 34)
                    .background((isExpired || isExhausted ? Color.red : Color.blue).opacity(0.1), in: RoundedRectangle(cornerRadius: 8, style: .continuous))

                VStack(alignment: .leading, spacing: 5) {
                    Text(key.code)
                        .font(.headline.monospaced())
                        .lineLimit(1)
                        .textSelection(.enabled)
                    HStack(spacing: 8) {
                        AdminRegistrationChip(title: countLabel, systemImage: "number", color: isExhausted ? .red : .green)
                        if let roleName = key.roleName, !roleName.isEmpty {
                            AdminRegistrationChip(title: roleName, systemImage: "key.horizontal", color: .blue)
                        }
                        AdminRegistrationChip(title: expireLabel, systemImage: "calendar", color: isExpired ? .red : .secondary)
                    }
                }

                Spacer()

                Menu {
                    Button(action: copyCode) {
                        Label("Copy Code", systemImage: "doc.on.doc")
                    }
                    Button(action: showHistory) {
                        Label("Use History", systemImage: "clock.arrow.circlepath")
                    }
                    Button(role: .destructive, action: delete) {
                        Label("Delete", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .font(.title3)
                        .frame(width: 32, height: 32)
                }
                .disabled(isBusy)
            }

            if let createTime = key.createTime {
                Label(createTime, systemImage: "clock")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(14)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(.secondary.opacity(0.12), lineWidth: 1)
        }
    }

    private var isExpired: Bool {
        key.expireTime == nil
    }

    private var isExhausted: Bool {
        (key.count ?? 0) <= 0
    }

    private var countLabel: String {
        isExhausted ? "Exhausted" : "\(key.count ?? 0) left"
    }

    private var expireLabel: String {
        key.expireTime ?? "Expired"
    }
}

private struct AdminRegistrationChip: View {
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

private struct AdminRegistrationNotice: View {
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

private struct AdminRegistrationKeyAddDraft: Identifiable {
    var id = UUID()
    var defaultRoleId: Int
}

private struct AdminRegistrationKeyAddSheet: View {
    @Environment(\.dismiss) private var dismiss

    var roles: [ChemVaultRole]
    var save: (RegistrationKeyAddRequest) async throws -> Void

    @State private var code: String
    @State private var roleId: Int
    @State private var count = 1
    @State private var expireDate = Calendar.current.date(byAdding: .month, value: 1, to: Date()) ?? Date()
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(
        draft: AdminRegistrationKeyAddDraft,
        roles: [ChemVaultRole],
        save: @escaping (RegistrationKeyAddRequest) async throws -> Void
    ) {
        self.roles = roles
        self.save = save
        self._roleId = State(initialValue: draft.defaultRoleId)
        self._code = State(initialValue: Self.generateCode())
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Registration Key") {
                    HStack {
                        TextField("Code", text: $code)
                            .font(.system(.body, design: .monospaced))
                            .autocorrectionDisabled()
                        Button {
                            code = Self.generateCode()
                        } label: {
                            Image(systemName: "arrow.triangle.2.circlepath")
                        }
                        .buttonStyle(.plain)
                    }

                    Picker("Role", selection: $roleId) {
                        ForEach(roles) { role in
                            Text(role.name).tag(role.roleId)
                        }
                    }

                    DatePicker("Valid Until", selection: $expireDate, displayedComponents: .date)
                    Stepper("Uses: \(count)", value: $count, in: 1...99999)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Add Key")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await saveKey() }
                    } label: {
                        if isSaving {
                            ChemVaultLoadingMark(size: 16, showsTrack: false)
                        } else {
                            Text("Add")
                        }
                    }
                    .disabled(!canSave)
                }
            }
        }
    }

    private var canSave: Bool {
        !isSaving && code.nilIfBlank != nil && roleId > 0 && count > 0
    }

    private func saveKey() async {
        guard let cleanCode = code.nilIfBlank else { return }
        isSaving = true
        errorMessage = nil
        do {
            try await save(
                RegistrationKeyAddRequest(
                    code: cleanCode,
                    roleId: roleId,
                    count: count,
                    expireTime: Self.apiDateFormatter.string(from: expireDate)
                )
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }

    private static func generateCode(length: Int = 8) -> String {
        let chars = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789")
        return String((0..<length).compactMap { _ in chars.randomElement() })
    }

    private static let apiDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        return formatter
    }()
}

private struct AdminRegistrationKeyHistorySheet: View {
    @EnvironmentObject private var appEnvironment: AppEnvironment
    @Environment(\.dismiss) private var dismiss
    var key: RegistrationKey

    @State private var history: [RegistrationKeyHistoryRow] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            List {
                ForEach(history) { row in
                    VStack(alignment: .leading, spacing: 5) {
                        Text(row.email)
                            .font(.headline)
                            .lineLimit(1)
                            .textSelection(.enabled)
                        if let createTime = row.createTime {
                            Label(createTime, systemImage: "calendar")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                    }
                }
            }
            .overlay {
                if isLoading {
                    ProgressView()
                } else if history.isEmpty && errorMessage == nil {
                    ContentUnavailableView("Use History", systemImage: "clock", description: Text("No users have used this key."))
                }
            }
            .navigationTitle(key.code)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .task { await load() }
        }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        do {
            history = try await appEnvironment.apiClient.registrationKeyHistory(regKeyId: key.regKeyId)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

private enum AdminRegistrationKeyConfirmation: Identifiable {
    case delete(RegistrationKey)
    case clearUnused

    var id: String {
        switch self {
        case .delete(let key): return "delete-\(key.regKeyId)"
        case .clearUnused: return "clear-unused"
        }
    }

    var title: String {
        switch self {
        case .delete: return "Delete Registration Key"
        case .clearUnused: return "Clear Registration Keys"
        }
    }

    var message: String {
        switch self {
        case .delete(let key): return "Delete \(key.code)?"
        case .clearUnused: return "Remove keys with no remaining uses or expired valid dates."
        }
    }
}
