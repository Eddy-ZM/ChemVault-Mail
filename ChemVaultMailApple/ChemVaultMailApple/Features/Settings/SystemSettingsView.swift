import SwiftUI

struct SystemSettingsView: View {
    @EnvironmentObject private var appEnvironment: AppEnvironment
    @EnvironmentObject private var preferences: AppPreferences
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var settings: ChemVaultSetting?
    @State private var rawSettings: JSONValue?
    @State private var isLoading = false
    @State private var isSavingAPIBaseURL = false
    @State private var isSavingSettings = false
    @State private var apiBaseURLDraft = AppPreferences.defaultBaseURL
    @State private var errorMessage: String?
    @State private var statusMessage: String?
    @State private var settingsDraft: SystemSettingsDraft?

    var body: some View {
        List {
            if let settings {
                Section("Website") {
                    LabeledContent("Title", value: settings.title ?? "")
                    LabeledContent("Send", value: settings.send.map(String.init) ?? "")
                    LabeledContent("Receive", value: settings.receive.map(String.init) ?? "")
                    LabeledContent("Register", value: settings.register.map(String.init) ?? "")
                    LabeledContent("Multiple Mailboxes", value: settings.manyEmail.map(String.init) ?? "")
                    LabeledContent("Add Mailbox", value: settings.addEmail.map(String.init) ?? "")
                    LabeledContent("Auto Refresh", value: settings.autoRefresh.map(String.init) ?? "")
                    LabeledContent("Min Email Prefix", value: settings.minEmailPrefix.map(String.init) ?? "")
                    LabeledContent("R2 Domain", value: settings.r2Domain ?? "")
                }

                Section("Common Admin Controls") {
                    Button {
                        settingsDraft = SystemSettingsDraft(settings: settings)
                    } label: {
                        if isSavingSettings {
                            ChemVaultLoadingButtonLabel(title: "Saving", size: 16)
                        } else {
                            Label("Edit Website and Mail Rules", systemImage: "slider.horizontal.3")
                        }
                    }
                    .disabled(isSavingSettings)

                    if settings.blackSubject?.nilIfBlank != nil || settings.blackContent?.nilIfBlank != nil || settings.blackFrom?.nilIfBlank != nil {
                        LabeledContent("Blocked Subjects", value: settings.blackSubject ?? "")
                        LabeledContent("Blocked Content", value: settings.blackContent ?? "")
                        LabeledContent("Blocked Senders", value: settings.blackFrom ?? "")
                    }
                }
            }

            Section("Global API") {
                LabeledContent {
                    Text(managedAPIBaseURL)
                        .multilineTextAlignment(.trailing)
                        .textSelection(.enabled)
                } label: {
                    Label("Managed Endpoint", systemImage: "network")
                }

                TextField("https://mail.chemvault.science/api", text: $apiBaseURLDraft)
                    .font(.system(.body, design: .monospaced))
                    .autocorrectionDisabled()
                    .textSelection(.enabled)

                HStack {
                    Button {
                        saveGlobalAPIBaseURL()
                    } label: {
                        if isSavingAPIBaseURL {
                            ChemVaultLoadingButtonLabel(title: "Saving", size: 16)
                        } else {
                            Label("Save Global API", systemImage: "checkmark.shield.fill")
                        }
                    }
                    .disabled(normalizedDraftBaseURL == nil || isSavingAPIBaseURL)

                    Spacer()

                    Button {
                        saveGlobalAPIBaseURL(AppPreferences.defaultBaseURL)
                    } label: {
                        Label("Production", systemImage: "server.rack")
                    }
                    .disabled(isSavingAPIBaseURL)
                }

                Label("Synced to native app users", systemImage: "arrow.triangle.2.circlepath")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(ChemVaultLoadingConfiguration.primaryColor(for: colorScheme))
            }

            if let rawSettings {
                Section("Raw Settings") {
                    Text(rawSettings.description)
                        .font(.caption)
                        .textSelection(.enabled)
                }
            }

            if let statusMessage {
                Section {
                    Label(statusMessage, systemImage: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                }
                .transition(.opacity.combined(with: .scale(scale: 0.98)).combined(with: .offset(y: -8)))
            }

            if let errorMessage {
                Section {
                    Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(ChemVaultTheme.errorText(for: colorScheme))
                }
                .transition(.opacity.combined(with: .scale(scale: 0.98)).combined(with: .offset(y: -8)))
            }
        }
        .overlay {
            if isLoading {
                ProgressView()
                    .transition(.opacity.combined(with: .scale(scale: 0.96)))
            }
        }
        .navigationTitle("System Settings")
        .toolbar {
            ToolbarItemGroup {
                if let settings {
                    Button {
                        settingsDraft = SystemSettingsDraft(settings: settings)
                    } label: {
                        Label("Edit", systemImage: "slider.horizontal.3")
                    }
                    .disabled(isSavingSettings)
                }

                Button {
                    Task { await load() }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
            }
        }
        .sheet(item: $settingsDraft) { draft in
            SystemSettingsEditSheet(draft: draft) { request in
                try await saveSystemSettings(request)
            }
        }
        .task { await load() }
        .animation(reduceMotion ? nil : ChemVaultMotion.depthShift, value: isLoading)
        .animation(reduceMotion ? nil : ChemVaultMotion.depthShift, value: isSavingAPIBaseURL)
        .animation(reduceMotion ? nil : ChemVaultMotion.depthShift, value: isSavingSettings)
        .animation(reduceMotion ? nil : ChemVaultMotion.depthShift, value: statusMessage)
        .animation(reduceMotion ? nil : ChemVaultMotion.depthShift, value: errorMessage)
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        do {
            let loadedSettings: ChemVaultSetting = try await appEnvironment.apiClient.get("/setting/query")
            settings = loadedSettings
            preferences.applyGlobalBaseURLIfPresent(loadedSettings.appleApiBaseURL)
            apiBaseURLDraft = AppPreferences.normalizedBaseURL(loadedSettings.appleApiBaseURL) ?? preferences.baseURLString
            rawSettings = try? await appEnvironment.apiClient.rawGet("/setting/query")
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private var managedAPIBaseURL: String {
        AppPreferences.normalizedBaseURL(settings?.appleApiBaseURL) ?? preferences.baseURLString
    }

    private var normalizedDraftBaseURL: String? {
        AppPreferences.normalizedBaseURL(apiBaseURLDraft)
    }

    private func saveGlobalAPIBaseURL(_ value: String? = nil) {
        let draft = value ?? apiBaseURLDraft
        guard let normalized = AppPreferences.normalizedBaseURL(draft) else {
            errorMessage = "Enter a valid http or https API URL."
            statusMessage = nil
            return
        }

        isSavingAPIBaseURL = true
        errorMessage = nil
        Task {
            do {
                try await appEnvironment.apiClient.setGlobalAPIBaseURL(normalized)
                preferences.setAdminManagedBaseURL(normalized)
                apiBaseURLDraft = normalized
            settings?.appleApiBaseURL = normalized
            statusMessage = "Global API server updated."
        } catch {
            errorMessage = error.localizedDescription
            statusMessage = nil
        }
        isSavingAPIBaseURL = false
    }

    private func saveSystemSettings(_ request: SystemSettingsUpdateRequest) async throws {
        isSavingSettings = true
        errorMessage = nil
        statusMessage = nil
        do {
            try await appEnvironment.apiClient.updateSystemSettings(request)
            statusMessage = "System settings updated."
            await load()
        } catch {
            errorMessage = error.localizedDescription
            isSavingSettings = false
            throw error
        }
        isSavingSettings = false
    }
}

private struct SystemSettingsDraft: Identifiable {
    var id = UUID()
    var settings: ChemVaultSetting
}

private struct SystemSettingsEditSheet: View {
    @Environment(\.dismiss) private var dismiss

    var save: (SystemSettingsUpdateRequest) async throws -> Void

    @State private var title: String
    @State private var registerEnabled: Bool
    @State private var receiveEnabled: Bool
    @State private var sendEnabled: Bool
    @State private var manyEmailEnabled: Bool
    @State private var addEmailEnabled: Bool
    @State private var autoRefresh: Int
    @State private var minEmailPrefix: Int
    @State private var blackSubject: String
    @State private var blackContent: String
    @State private var blackFrom: String
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(draft: SystemSettingsDraft, save: @escaping (SystemSettingsUpdateRequest) async throws -> Void) {
        self.save = save
        let settings = draft.settings
        self._title = State(initialValue: settings.title ?? "ChemVault Mail")
        self._registerEnabled = State(initialValue: settings.register != 1)
        self._receiveEnabled = State(initialValue: settings.receive != 1)
        self._sendEnabled = State(initialValue: settings.send != 1)
        self._manyEmailEnabled = State(initialValue: settings.manyEmail != 1)
        self._addEmailEnabled = State(initialValue: settings.addEmail != 1)
        self._autoRefresh = State(initialValue: settings.autoRefresh ?? 5)
        self._minEmailPrefix = State(initialValue: settings.minEmailPrefix ?? 1)
        self._blackSubject = State(initialValue: settings.blackSubject ?? "")
        self._blackContent = State(initialValue: settings.blackContent ?? "")
        self._blackFrom = State(initialValue: settings.blackFrom ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Website") {
                    TextField("Title", text: $title)
                        .autocorrectionDisabled()
                    Toggle("Allow Registration", isOn: $registerEnabled)
                    Toggle("Receive Mail", isOn: $receiveEnabled)
                    Toggle("Send Mail", isOn: $sendEnabled)
                }

                Section("Mailbox Rules") {
                    Toggle("Allow Multiple Mailboxes", isOn: $manyEmailEnabled)
                    Toggle("Allow Add Mailbox", isOn: $addEmailEnabled)
                    Stepper("Auto Refresh: \(autoRefresh)s", value: $autoRefresh, in: 0...3600)
                    Stepper("Min Email Prefix: \(minEmailPrefix)", value: $minEmailPrefix, in: 1...64)
                }

                Section("Blacklist") {
                    TextField("Blocked subjects, comma separated", text: $blackSubject, axis: .vertical)
                        .autocorrectionDisabled()
                    TextField("Blocked content, comma separated", text: $blackContent, axis: .vertical)
                        .autocorrectionDisabled()
                    TextField("Blocked senders, comma separated", text: $blackFrom, axis: .vertical)
                        .autocorrectionDisabled()
                }

                Section {
                    Label("Credential, storage, OAuth, and verification secrets remain editable only on the web console.", systemImage: "lock.shield")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Edit System Settings")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await saveSettings() }
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
        !isSaving && title.nilIfBlank != nil
    }

    private func saveSettings() async {
        guard let cleanTitle = title.nilIfBlank else { return }
        isSaving = true
        errorMessage = nil
        do {
            try await save(
                SystemSettingsUpdateRequest(
                    title: cleanTitle,
                    register: registerEnabled ? 0 : 1,
                    receive: receiveEnabled ? 0 : 1,
                    send: sendEnabled ? 0 : 1,
                    manyEmail: manyEmailEnabled ? 0 : 1,
                    addEmail: addEmailEnabled ? 0 : 1,
                    autoRefresh: autoRefresh,
                    minEmailPrefix: minEmailPrefix,
                    blackSubject: blackSubject.trimmingCharacters(in: .whitespacesAndNewlines),
                    blackContent: blackContent.trimmingCharacters(in: .whitespacesAndNewlines),
                    blackFrom: blackFrom.trimmingCharacters(in: .whitespacesAndNewlines)
                )
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}
}
