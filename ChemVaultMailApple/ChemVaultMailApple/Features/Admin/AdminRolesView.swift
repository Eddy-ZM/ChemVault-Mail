import Foundation
import SwiftUI

struct AdminRolesView: View {
    @EnvironmentObject private var appEnvironment: AppEnvironment
    @State private var roles: [ChemVaultRole] = []
    @State private var permissionTree: [ChemVaultPermNode] = []
    @State private var settings: ChemVaultSetting?
    @State private var isLoading = false
    @State private var isMutating = false
    @State private var errorMessage: String?
    @State private var statusMessage: String?
    @State private var roleDraft: AdminRoleDraft?
    @State private var confirmation: AdminRoleConfirmation?

    var body: some View {
        ZStack {
            ChemVaultWorkspaceBackground()

            ScrollView {
                LazyVStack(spacing: 12) {
                    if let statusMessage {
                        AdminRoleNotice(message: statusMessage, systemImage: "checkmark.circle.fill", color: .green)
                    }

                    if let errorMessage {
                        AdminRoleNotice(message: errorMessage, systemImage: "exclamationmark.triangle.fill", color: .red)
                    }

                    AdminRolesSummaryCard(
                        total: roles.count,
                        defaultRole: roles.first(where: { $0.isDefault == 1 })?.name,
                        cloudflareAccessRole: cloudflareAccessRoleName,
                        isLoading: isLoading
                    )

                    if isLoading && roles.isEmpty {
                        ChemVaultLoadingView(title: "Roles", subtitle: "Loading role policy", size: 34, presentation: .card)
                    } else if roles.isEmpty && errorMessage == nil {
                        ContentUnavailableView("Roles", systemImage: "key.horizontal", description: Text("No roles loaded."))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 36)
                            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    } else {
                        ForEach(roles) { role in
                            AdminRoleCard(
                                role: role,
                                isCloudflareAccessRole: isCloudflareAccessRole(role),
                                isBusy: isMutating,
                                edit: { roleDraft = AdminRoleDraft(role: role, cloudflareAccessRoleId: cloudflareAccessRoleId) },
                                setDefault: { mutate { try await setDefault(role) } },
                                toggleCloudflareAccess: { mutate { try await toggleCloudflareAccess(role) } },
                                delete: { confirmation = AdminRoleConfirmation(role: role) }
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
                ChemVaultLoadingView(title: "Applying role changes", subtitle: "Syncing permissions", size: 34, presentation: .card)
                    .padding()
                    .background(.black.opacity(0.12))
                    .transition(.opacity)
            }
        }
        .navigationTitle("Roles")
        .toolbar {
            ToolbarItemGroup {
                Button {
                    roleDraft = AdminRoleDraft(role: nil, cloudflareAccessRoleId: cloudflareAccessRoleId)
                } label: {
                    Label("Add Role", systemImage: "plus")
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
        .sheet(item: $roleDraft) { draft in
            AdminRoleEditorSheet(
                draft: draft,
                permissionTree: permissionTree,
                domainList: settings?.domainList ?? [],
                save: saveRole
            )
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
                Button("Delete Role", role: .destructive) {
                    mutate { try await deleteRole(confirmation.role) }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(confirmation?.message ?? "")
        }
        .task { await load() }
        .animation(ChemVaultMotion.depthShift, value: statusMessage)
        .animation(ChemVaultMotion.depthShift, value: errorMessage)
        .animation(ChemVaultMotion.routeTransition, value: roles)
    }

    private var cloudflareAccessRoleId: Int {
        settings?.cloudflareAccessExternalRoleId ?? 0
    }

    private var cloudflareAccessRoleName: String {
        guard cloudflareAccessRoleId > 0 else { return "Not set" }
        return roles.first(where: { $0.roleId == cloudflareAccessRoleId })?.name ?? "Role \(cloudflareAccessRoleId)"
    }

    private func isCloudflareAccessRole(_ role: ChemVaultRole) -> Bool {
        cloudflareAccessRoleId == role.roleId
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        do {
            async let fetchedRoles = appEnvironment.apiClient.adminRoles()
            async let fetchedTree = appEnvironment.apiClient.adminRolePermissionTree()
            async let fetchedSettings: ChemVaultSetting = appEnvironment.apiClient.get("/setting/query")
            let (loadedRoles, loadedTree, loadedSettings) = try await (fetchedRoles, fetchedTree, fetchedSettings)
            roles = loadedRoles
            permissionTree = loadedTree
            settings = loadedSettings
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

    private func saveRole(_ request: RoleSaveRequest, cloudflareAccess: Bool) async throws {
        if let roleId = request.roleId {
            try await appEnvironment.apiClient.updateAdminRole(request)
            try await syncCloudflareAccessRole(roleId: roleId, enabled: cloudflareAccess)
            statusMessage = "Role updated."
        } else {
            let role = try await appEnvironment.apiClient.addAdminRole(request)
            if cloudflareAccess {
                try await appEnvironment.apiClient.setCloudflareAccessRole(roleId: role.roleId)
            }
            statusMessage = "Role added."
        }
        await load()
    }

    private func setDefault(_ role: ChemVaultRole) async throws {
        try await appEnvironment.apiClient.setDefaultAdminRole(roleId: role.roleId)
        statusMessage = "\(role.name) is now the default role."
        await load()
    }

    private func toggleCloudflareAccess(_ role: ChemVaultRole) async throws {
        let nextRoleId = isCloudflareAccessRole(role) ? 0 : role.roleId
        try await appEnvironment.apiClient.setCloudflareAccessRole(roleId: nextRoleId)
        statusMessage = nextRoleId == 0 ? "Cloudflare Access role cleared." : "\(role.name) is now used for Cloudflare Access."
        await load()
    }

    private func syncCloudflareAccessRole(roleId: Int, enabled: Bool) async throws {
        let currentRoleId = cloudflareAccessRoleId
        if enabled && currentRoleId != roleId {
            try await appEnvironment.apiClient.setCloudflareAccessRole(roleId: roleId)
        } else if !enabled && currentRoleId == roleId {
            try await appEnvironment.apiClient.setCloudflareAccessRole(roleId: 0)
        }
    }

    private func deleteRole(_ role: ChemVaultRole) async throws {
        try await appEnvironment.apiClient.deleteAdminRole(roleId: role.roleId)
        if isCloudflareAccessRole(role) {
            try await appEnvironment.apiClient.setCloudflareAccessRole(roleId: 0)
        }
        statusMessage = "Role deleted."
        await load()
    }
}

private struct AdminRolesSummaryCard: View {
    var total: Int
    var defaultRole: String?
    var cloudflareAccessRole: String
    var isLoading: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Role Policy", systemImage: "key.horizontal.fill")
                    .font(.headline)
                Spacer()
                if isLoading {
                    ChemVaultLoadingMark(size: 18, showsTrack: false)
                }
            }

            HStack(spacing: 10) {
                AdminRoleMetric(title: "Roles", value: "\(total)", systemImage: "list.bullet")
                AdminRoleMetric(title: "Default", value: defaultRole ?? "None", systemImage: "checkmark.seal")
                AdminRoleMetric(title: "Access", value: cloudflareAccessRole, systemImage: "lock.shield")
            }
        }
        .padding(14)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

private struct AdminRoleMetric: View {
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
                    .font(.caption.weight(.semibold))
                    .lineLimit(1)
            }
        } icon: {
            Image(systemName: systemImage)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(9)
        .background(.background.opacity(0.55), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

private struct AdminRoleCard: View {
    var role: ChemVaultRole
    var isCloudflareAccessRole: Bool
    var isBusy: Bool
    var edit: () -> Void
    var setDefault: () -> Void
    var toggleCloudflareAccess: () -> Void
    var delete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 11) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: role.isDefault == 1 ? "checkmark.seal.fill" : "key.horizontal")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(role.isDefault == 1 ? .green : .blue)
                    .frame(width: 34, height: 34)
                    .background(.blue.opacity(0.1), in: RoundedRectangle(cornerRadius: 8, style: .continuous))

                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 8) {
                        Text(role.name)
                            .font(.headline)
                            .lineLimit(1)
                        if role.isDefault == 1 {
                            AdminRoleChip(title: "Default", systemImage: "checkmark.seal", color: .green)
                        }
                        if isCloudflareAccessRole {
                            AdminRoleChip(title: "Access", systemImage: "lock.shield", color: .blue)
                        }
                    }

                    if let description = role.description, !description.isEmpty {
                        Text(description)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                }

                Spacer()

                Menu {
                    Button(action: edit) {
                        Label("Edit Role", systemImage: "slider.horizontal.3")
                    }
                    Button(action: setDefault) {
                        Label("Set Default", systemImage: "checkmark.seal")
                    }
                    .disabled(role.isDefault == 1)
                    Button(action: toggleCloudflareAccess) {
                        Label(isCloudflareAccessRole ? "Clear Cloudflare Access" : "Use for Cloudflare Access", systemImage: "lock.shield")
                    }
                    Button(role: .destructive, action: delete) {
                        Label("Delete Role", systemImage: "trash")
                    }
                    .disabled(role.isDefault == 1)
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .font(.title3)
                        .frame(width: 32, height: 32)
                }
                .disabled(isBusy)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    AdminRoleChip(title: role.sendType ?? "count", systemImage: "paperplane", color: .blue)
                    AdminRoleChip(title: "\(role.sendCount ?? 0)", systemImage: "number", color: .secondary)
                    AdminRoleChip(title: "\(role.accountCount ?? 0)", systemImage: "person.2", color: .secondary)
                    AdminRoleChip(title: "Sort \(role.sort ?? 0)", systemImage: "arrow.up.arrow.down", color: .secondary)
                    AdminRoleChip(title: "\(role.permIds?.count ?? 0) perms", systemImage: "checklist", color: .purple)
                }
            }

            if !role.availDomainList.isEmpty || !role.banEmailList.isEmpty {
                VStack(alignment: .leading, spacing: 5) {
                    if !role.availDomainList.isEmpty {
                        Label(role.availDomainList.joined(separator: ", "), systemImage: "globe")
                            .lineLimit(1)
                    }
                    if !role.banEmailList.isEmpty {
                        Label(role.banEmailList.joined(separator: ", "), systemImage: "hand.raised")
                            .lineLimit(1)
                    }
                }
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
}

private struct AdminRoleChip: View {
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

private struct AdminRoleNotice: View {
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

private struct AdminRoleDraft: Identifiable {
    var role: ChemVaultRole?
    var cloudflareAccessRoleId: Int
    var seed = UUID()

    var id: String {
        role.map { "edit-\($0.roleId)" } ?? "add-\(seed.uuidString)"
    }
}

private struct AdminRoleEditorSheet: View {
    @Environment(\.dismiss) private var dismiss

    var draft: AdminRoleDraft
    var permissionTree: [ChemVaultPermNode]
    var domainList: [String]
    var save: (RoleSaveRequest, Bool) async throws -> Void

    @State private var name: String
    @State private var description: String
    @State private var banEmailText: String
    @State private var availDomainText: String
    @State private var sendType: String
    @State private var sendCount: Int
    @State private var accountCount: Int
    @State private var sort: Int
    @State private var selectedPermIds: Set<Int>
    @State private var cloudflareAccess: Bool
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(
        draft: AdminRoleDraft,
        permissionTree: [ChemVaultPermNode],
        domainList: [String],
        save: @escaping (RoleSaveRequest, Bool) async throws -> Void
    ) {
        self.draft = draft
        self.permissionTree = permissionTree
        self.domainList = domainList
        self.save = save
        let role = draft.role
        self._name = State(initialValue: role?.name ?? "")
        self._description = State(initialValue: role?.description ?? "")
        self._banEmailText = State(initialValue: role?.banEmailList.joined(separator: ", ") ?? "")
        self._availDomainText = State(initialValue: role?.availDomainList.joined(separator: ", ") ?? "")
        self._sendType = State(initialValue: role?.sendType ?? "count")
        self._sendCount = State(initialValue: role?.sendCount ?? 0)
        self._accountCount = State(initialValue: role?.accountCount ?? 0)
        self._sort = State(initialValue: role?.sort ?? 0)
        self._selectedPermIds = State(initialValue: Set(role?.permIds ?? []))
        self._cloudflareAccess = State(initialValue: role.map { $0.roleId == draft.cloudflareAccessRoleId } ?? false)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Role") {
                    TextField("Name", text: $name)
                        .autocorrectionDisabled()
                    TextField("Description", text: $description, axis: .vertical)
                    Stepper("Sort: \(sort)", value: $sort, in: 0...9999)
                    Toggle("Use for Cloudflare Access", isOn: $cloudflareAccess)
                }

                Section("Send and Account Limits") {
                    Picker("Send Type", selection: $sendType) {
                        Text("Total").tag("count")
                        Text("Daily").tag("day")
                        Text("Internal").tag("internal")
                        Text("Ban").tag("ban")
                    }
                    Stepper("Send Count: \(sendCount)", value: $sendCount, in: 0...99999)
                    Stepper("Account Count: \(accountCount)", value: $accountCount, in: 0...99999)
                }

                Section("Email Rules") {
                    TextField("Blocked email/domain, comma separated", text: $banEmailText, axis: .vertical)
                        .autocorrectionDisabled()
                    TextField("Allowed domains, comma separated", text: $availDomainText, axis: .vertical)
                        .autocorrectionDisabled()

                    if !domainList.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(normalizedDomainList, id: \.self) { domain in
                                    Button(domain) {
                                        appendDomain(domain)
                                    }
                                    .buttonStyle(.bordered)
                                    .controlSize(.small)
                                }
                            }
                            .padding(.vertical, 2)
                        }
                    }
                }

                Section("Permissions") {
                    if permissionTree.isEmpty {
                        Text("Permission tree is not loaded.")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(permissionTree) { node in
                            AdminPermissionNodeView(node: node, selectedPermIds: $selectedPermIds)
                        }
                    }
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle(draft.role == nil ? "Add Role" : "Edit Role")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await saveRole() }
                    } label: {
                        if isSaving {
                            ChemVaultLoadingMark(size: 16, showsTrack: false)
                        } else {
                            Text("Save")
                        }
                    }
                    .disabled(!canSave)
                }
            }
        }
    }

    private var canSave: Bool {
        !isSaving && name.nilIfBlank != nil
    }

    private var normalizedDomainList: [String] {
        domainList.map { normalizeDomain($0) }.filter { !$0.isEmpty }
    }

    private func saveRole() async {
        guard let cleanName = name.nilIfBlank else { return }
        isSaving = true
        errorMessage = nil
        do {
            let request = RoleSaveRequest(
                roleId: draft.role?.roleId,
                name: cleanName,
                description: description.trimmingCharacters(in: .whitespacesAndNewlines),
                banEmail: splitList(banEmailText),
                availDomain: splitList(availDomainText).map(normalizeDomain).filter { !$0.isEmpty },
                sendType: sendType,
                sendCount: sendCount,
                accountCount: accountCount,
                sort: sort,
                permIds: selectedPermIds.sorted()
            )
            try await save(request, cloudflareAccess)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }

    private func appendDomain(_ domain: String) {
        var domains = splitList(availDomainText).map(normalizeDomain).filter { !$0.isEmpty }
        guard !domains.contains(domain) else { return }
        domains.append(domain)
        availDomainText = domains.joined(separator: ", ")
    }

    private func splitList(_ value: String) -> [String] {
        value.components(separatedBy: CharacterSet(charactersIn: ",，;；\n"))
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }

    private func normalizeDomain(_ value: String) -> String {
        var domain = value.trimmingCharacters(in: .whitespacesAndNewlines)
        while domain.hasPrefix("@") {
            domain.removeFirst()
        }
        return domain
    }
}

private struct AdminPermissionNodeView: View {
    var node: ChemVaultPermNode
    @Binding var selectedPermIds: Set<Int>

    var body: some View {
        if node.childNodes.isEmpty {
            Toggle(isOn: permissionBinding(node.permId)) {
                Text(node.name)
            }
        } else {
            DisclosureGroup {
                HStack {
                    Button("Select All") {
                        setChildren(node.childNodes, selected: true)
                    }
                    Button("Clear") {
                        setChildren(node.childNodes, selected: false)
                    }
                }
                .buttonStyle(.borderless)
                .font(.caption)

                ForEach(node.childNodes) { child in
                    if child.childNodes.isEmpty {
                        Toggle(isOn: permissionBinding(child.permId)) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(child.name)
                                if let permKey = child.permKey, !permKey.isEmpty {
                                    Text(permKey)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    } else {
                        AdminPermissionNodeView(node: child, selectedPermIds: $selectedPermIds)
                    }
                }
            } label: {
                Text(node.name)
                    .font(.subheadline.weight(.semibold))
            }
        }
    }

    private func permissionBinding(_ permId: Int) -> Binding<Bool> {
        Binding {
            selectedPermIds.contains(permId)
        } set: { isSelected in
            if isSelected {
                selectedPermIds.insert(permId)
            } else {
                selectedPermIds.remove(permId)
            }
        }
    }

    private func setChildren(_ children: [ChemVaultPermNode], selected: Bool) {
        for child in children {
            if child.childNodes.isEmpty {
                if selected {
                    selectedPermIds.insert(child.permId)
                } else {
                    selectedPermIds.remove(child.permId)
                }
            } else {
                setChildren(child.childNodes, selected: selected)
            }
        }
    }
}

private struct AdminRoleConfirmation: Identifiable {
    var role: ChemVaultRole

    var id: Int { role.roleId }
    var title: String { "Delete Role" }
    var message: String { "Delete \(role.name)? Users currently assigned to this role will be moved to the default role." }
}
